# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 4 (IN PROGRESS — authentication + device linking)

Phase 4 adds **user accounts** and **device linking**. Until now the dashboard has been a single, unauthenticated view hardcoded to one device (`G3036`). Phase 4 introduces registration, login, and a link-device step so the dashboard becomes scoped to *the device a specific user has linked*, rather than a single global device.

### Flow (CONFIRMED — source of truth for this phase)

```
Register (username, email, password)
      ↓
Login (returns JWT)
      ↓
GET /api/auth/me → does this user have a linked device?
      │
      ├── NO  → Link Device page (device ID + device code) → on success, saved to user → Dashboard
      │
      └── YES → Dashboard (scoped to that user's linked device)
```

- A user with **no linked device always lands on the Link Device page after login** — this is not a one-time onboarding step skipped later, it's checked every time `me` is called, so a half-registered account can never see a dashboard.
- **One device per user in Phase 4.** A user cannot link a second device yet — the UI and API only support a single `device` per user. Multi-device is explicitly deferred to Phase 5 (see below).

### Why this isn't just "add a login page" — the collection-per-device wrinkle

Before Phase 4, `Reading` was a single hardcoded Mongoose model bound to one collection:

```js
module.exports = mongoose.model('Reading', readingSchema, 'G3036');
```

Per the Data Source section below, **each device lives in its own MongoDB collection** on the shared Atlas cluster (`G3036`, `G3007`, `G3009`, etc.) — devices are not rows distinguished by a `device_id` field in one shared collection. That means "show the dashboard for this user's linked device" isn't a query filter, it's a **choice of which collection to query**.

**Resolution:** `Reading.js` changes from a static export to a factory function keyed by collection/device name:

```js
// server/src/models/Reading.js
function getReadingModel(deviceId) {
  return mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId);
}
module.exports = { getReadingModel };
```

Every function in `readingsController.js` now takes `req.user.device.deviceId` (set by the `requireAuth` middleware from the JWT + a DB lookup) and calls `getReadingModel(deviceId)` instead of importing a fixed `Reading`. This is the seam that makes per-user device-scoping possible now, and it's also exactly what Phase 5 (multiple devices per user) will reuse — no rework needed there, just picking which of the user's linked device IDs to pass in.

### Device code validation (CONFIRMED)

There's a real device-code concept on the physical hardware, but since only the `G3036` mimic device exists right now, codes are assigned manually. A new seeded collection, `devices`, is the source of truth for which device IDs exist and what code proves a user is allowed to claim one:

```js
// devices collection, iotdb database
{ deviceId: "G3036", deviceCode: "PROHORI-G3036-7X4K2" }
```

- The `link-device` endpoint validates the submitted `{ deviceId, deviceCode }` pair against this collection before saving the link onto the user.
- **When new mimic devices are added later, each one needs its own seeded `devices` document with its own code** — this is not automatic, it's a manual seeding step per device, same as `G3036`'s.
- This collection is separate from the per-device reading collections (`G3036`, etc.) — it exists purely for the linking/auth flow, not sensor data.

## Stack (additions for Phase 4)

**Backend**
- `bcrypt` — password hashing
- `jsonwebtoken` — JWT issuing/verification for auth
- New `User` model (`server/src/models/User.js`) and `Device` model (`server/src/models/Device.js`, backs the seeded `devices` collection above)
- New `requireAuth` middleware (`server/src/middleware/requireAuth.js`) — verifies JWT, attaches `req.user` (including linked device, if any) to the request
- `Reading` model refactored to the `getReadingModel(deviceId)` factory described above

**Frontend**
- New pages: `Login.jsx`, `Register.jsx`, `LinkDevice.jsx` (see `PAGES.md`)
- `AuthContext` / `useAuth()` hook — holds JWT + user object, persisted in `localStorage`
- Axios instance updated to attach `Authorization: Bearer <token>` on every request
- Route guarding (in `App.jsx`): unauthenticated → `/login`; authenticated with no linked device → `/link-device`; authenticated with a linked device → normal routes (`/`, `/history`, `/calendar`)

Everything else (Socket.IO, Change Streams, MQTT pipeline, threshold logic, Recharts) is **unchanged by Phase 4** — this phase only adds an auth/identity layer in front of the existing read path.

## User & Device Data Model (Phase 4)

New collection: `users` (separate database/cluster area from `iotdb.G3036` — use a dedicated `authdb` database or a clearly-named collection in the existing cluster; agent should confirm placement against `MONGO_URI` target before creating).

```js
// User
{
  _id: ObjectId,
  username: String,       // unique, required
  email: String,          // unique, required
  passwordHash: String,   // bcrypt hash, never store plaintext
  device: {               // single embedded object — NOT an array in Phase 4
    deviceId: String,     // e.g. "G3036" — matches a devices collection entry
    linkedAt: Date
  } | null,                // null/absent until link-device succeeds
  createdAt: Date
}
```

```js
// Device (seeded, validates link-device requests)
{
  _id: ObjectId,
  deviceId: String,     // e.g. "G3036" — matches the Reading collection name
  deviceCode: String     // e.g. "PROHORI-G3036-7X4K2" — manually assigned per device
}
```

Rules:
- `device` stays a single embedded object in Phase 4, deliberately — not an array. Phase 5 changes this to `devices: [{ deviceId, linkedAt }]`; every place reading `user.device.deviceId` becomes "look up the active device," a contained migration rather than a rewrite.
- Never trust a client-submitted `deviceId` for reading queries — always resolve it server-side from `req.user.device.deviceId` (set by `requireAuth` after verifying the JWT and loading the user).
- `/api/readings/*` routes require `requireAuth` and 403 with a clear "no device linked" error if `req.user.device` is missing — the frontend redirects before this is normally reachable, but the API must not rely on that alone.

## Data Source — DO NOT GUESS FIELD NAMES

Database: `iotdb`
Collection: keyed per device — currently only `G3036`

Document shape (confirmed from live data, do not alter):

```js
{
  _id: ObjectId,
  device_id: String,       // "G3036"
  ammonia: Number,         // Double, ppm
  methane: Number,         // Double, ppm
  humidity: Number,        // Int — CONFIRMED unit: percent (%)
  temperature: Number,     // Int, likely °F
  timestamp: Number,       // Unix epoch seconds, set by device/mimic device
  created_at: Date         // ISODate, set by DB insert (mqtt-bridge) — use this for sorting/filtering, not `timestamp`
}
```

Rules (unchanged since Phase 1–3, now with the added collection-per-device caveat spelled out above):
- Never invent fields that aren't in this schema.
- `server/` never writes/inserts/updates documents in reading collections — read-only. Only `mqtt-bridge/` writes.
- Use `created_at` (not `timestamp`) for all date range queries, sorting, and aggregation grouping.
- Reading collections are looked up dynamically via `getReadingModel(deviceId)` (Phase 4) — never hardcode `'G3036'` in new controller code. Existing Phase 1–3 code that hardcoded it is being migrated as part of this phase.
- The `users` and `devices` collections (Phase 4, new) are a separate concern from reading data — plain Mongoose models, no dynamic collection selection needed for them.
- Connection string(s) live in `.env` files as before — never hardcode, never commit `.env`.

## Folder Structure

```
prohori-dashboard/
│
├── server/                        # Express API — reads from MongoDB, serves REST + Socket.IO
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Mongoose connection setup, reads MONGO_URI from .env
│   │   ├── models/
│   │   │   ├── Reading.js         # CHANGED (Phase 4): factory getReadingModel(deviceId),
│   │   │   │                      #   not a static single-collection export — see architecture note above
│   │   │   ├── User.js            # NEW (Phase 4): username, email, passwordHash,
│   │   │   │                      #   device { deviceId, linkedAt }
│   │   │   └── Device.js          # NEW (Phase 4): backs the seeded `devices` collection
│   │   │                          #   (deviceId, deviceCode) used to validate link-device requests
│   │   ├── controllers/
│   │   │   ├── authController.js       # NEW (Phase 4): register, login, me, linkDevice
│   │   │   └── readingsController.js   # CHANGED (Phase 4): every function now resolves its
│   │   │                               #   collection via getReadingModel(req.user.device.deviceId)
│   │   │                               #   instead of importing a fixed Reading model
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification logic (safe/warning/danger) — unchanged
│   │   ├── routes/
│   │   │   ├── auth.js            # NEW (Phase 4): /api/auth/register, /login, /me, /link-device
│   │   │   └── readings.js        # CHANGED (Phase 4): requireAuth middleware applied to all routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Centralized error handling — unchanged
│   │   │   └── requireAuth.js     # NEW (Phase 4): verifies JWT, loads user, attaches req.user
│   │   │                          #   (including linked device, if any) to the request
│   │   ├── sockets/
│   │   │   └── changeStream.js    # Watches reading collections via Change Streams, emits
│   │   │                          #   `new-reading` via Socket.IO — unchanged by Phase 4
│   │   │                          #   (see "Out of Scope" re: per-user socket scoping)
│   │   └── app.js                 # CHANGED (Phase 4): mounts /api/auth, applies requireAuth
│   │                              #   to /api/readings, otherwise unchanged
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN, JWT_SECRET (NEW) — gitignored
│   ├── .env.example
│   └── package.json               # CHANGED (Phase 4): adds bcrypt, jsonwebtoken
│
├── mimic-device/                  # Publishes fake sensor readings over MQTT — semi-permanent
│   │                               # stand-in for the physical device, runs against the REAL broker.
│   │                               # Unchanged by Phase 4.
│   ├── generator.py
│   ├── publisher.py
│   ├── run_local_test.py
│   ├── .env
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
│
├── mqtt-bridge/                   # Subscribes to MQTT, writes into device reading collections —
│   │                               # the sole writer to those collections. Unchanged by Phase 4.
│   ├── bridge.py
│   ├── .env
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
│
├── simulator/                     # RETIRED (Phase 2) — never run concurrently with the MQTT pipeline.
│   ├── simulate_device.py
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── client/                        # React (Vite) frontend — the dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx           # CHANGED (Phase 4): adds a logout control
│   │   │   │   └── Header.jsx            # Unchanged
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx
│   │   │   │   ├── ReadingsPanel.jsx
│   │   │   │   ├── HistoryTable.jsx
│   │   │   │   ├── HistoryTabs.jsx
│   │   │   │   └── TrendChart.jsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx
│   │   │   │   └── DayDetailCards.jsx
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # NEW (Phase 4): token + user state, persisted in localStorage,
│   │   │                          #   exposes useAuth()
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Unchanged content — now sits behind route guards, see PAGES.md
│   │   │   ├── History.jsx        # Unchanged content — same guarding
│   │   │   ├── Calendar.jsx       # Unchanged content — same guarding
│   │   │   ├── Login.jsx          # NEW (Phase 4)
│   │   │   ├── Register.jsx       # NEW (Phase 4)
│   │   │   └── LinkDevice.jsx     # NEW (Phase 4)
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Socket.IO listener — unchanged by Phase 4
│   │   │   ├── useReadingsHistory.js     # Fetches daily-averages — unchanged
│   │   │   ├── useReadingsLog.js         # Fetches paginated reading log — unchanged
│   │   │   ├── useCalendarData.js        # Fetches month grid + day drill-down — unchanged
│   │   │   └── useDayDetail.js
│   │   ├── services/
│   │   │   ├── api.js              # CHANGED (Phase 4): axios interceptor attaches
│   │   │   │                       #   Authorization: Bearer <token> to every request
│   │   │   └── socket.js           # Unchanged
│   │   ├── App.jsx                # CHANGED (Phase 4): route guarding per the table in PAGES.md
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── AGENTS.md                      # This file — stack, schema, conventions, folder guide
├── PAGES.md                       # Screen/section breakdown for the current phase
├── DESIGN.md                      # Stitch design output translated into design tokens/specs
└── README.md                      # Setup instructions
```

## API Contract (Phase 4 additions)

- `POST /api/auth/register` → `{ username, email, password }` → creates user, returns JWT
- `POST /api/auth/login` → `{ email, password }` → returns JWT
- `GET /api/auth/me` → (requires auth) → `{ username, email, device: { deviceId, linkedAt } | null }`
- `POST /api/auth/link-device` → (requires auth) → `{ deviceId, deviceCode }` → validates against `devices` collection, saves to user, returns updated user
- All `/api/readings/*` endpoints (unchanged paths from Phase 3) now **require auth** and resolve the collection from `req.user.device.deviceId` instead of a hardcoded name. If no device is linked, they return `403` with a message the frontend can use to redirect to `/link-device` as a fallback.
- `GET /health` → unchanged, no auth required
- **Socket.IO:** `new-reading` event — for Phase 4, still broadcasts globally per device's Change Stream. Scoping socket delivery to only the connected user's linked device is **out of scope for Phase 4** (flagged below) — for now the dashboard only has one device (`G3036`) to watch regardless, so this isn't yet a real leak, but note it before Phase 5 introduces devices other users might not be linked to.

## Conventions (Phase 4 additions)

- Passwords: bcrypt, minimum cost factor 10, never log or return `passwordHash`.
- JWT: short-lived access token (e.g. 7 days for this internship-scale project; no refresh-token flow needed yet), signed with a secret from `.env` (`JWT_SECRET`), never hardcoded.
- `JWT_SECRET` added to `server/.env` / `.env.example`.
- Frontend stores the token in `localStorage` (acceptable for this project's threat model; note for future hardening if this ever goes beyond an internship demo).
- Every new auth/device-linking route follows the same controller/route/middleware separation as existing code — no business logic inside route files.

## Known Temporary Workarounds (Still Open — Unrelated to Phase 4)

- Cutoffs: `getHistory`/`getDailyAverages` still use document-count `.limit()` windowing instead of a genuine `Date.now()`-relative `$gte` filter.
- UTC day-boundary grouping in `getDailyAverages` — unverified for a Bangladesh-based (UTC+6) user.
- Search `TODO(revert-for-production)` in `readingsController.js` for exact spots.

## Out of Scope for This Phase

- Multiple devices per user (Phase 5 — `device` object becomes a `devices` array)
- Scoping Socket.IO `new-reading` delivery per connected user's device (flagged above, deferred alongside multi-device)
- Password reset / email verification flows
- Role-based access (admin vs regular user)
- OAuth / third-party login

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.
- **Phase 3 (COMPLETE)**: Replaced the direct-to-Mongo simulator with a real MQTT pipeline (`mimic-device/` + `mqtt-bridge/`), verified end-to-end including live Socket.IO delivery to the dashboard.
- **Phase 4 (IN PROGRESS)**: Authentication (register/login via JWT + bcrypt) and single-device linking per user. Key architectural change: `Reading` model becomes a factory keyed by device ID instead of a static single-collection export, since each device lives in its own MongoDB collection. Device-code validation backed by a new seeded `devices` collection — `G3036`'s code is `PROHORI-G3036-7X4K2`, arbitrary for now since there's no physical device yet. Multi-device per user explicitly deferred to Phase 5.