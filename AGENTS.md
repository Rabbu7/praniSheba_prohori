# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 4 COMPLETE — Phase 5 not yet scoped

Phase 4 added **user accounts** and **single-device linking**. The dashboard is no longer a single, unauthenticated view hardcoded to one device — it's now scoped to *the device a specific user has linked*, with a full register → login → link-device → dashboard flow, route guarding, and logout.

Alongside closing out Phase 4, two long-standing **Phase 2** frontend gaps were also closed in this cycle (see "Phase 2 Cleanup" below): the Dashboard chart and Reading Log page were still calling old Phase 1 endpoints instead of the daily-averages/unbounded-log endpoints Phase 2 introduced, and the Calendar page (speced in Phase 2, backend-only until now) had no frontend at all. Both are now fully wired.

### Flow (CONFIRMED — source of truth, implemented and verified)

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

- A user with **no linked device always lands on the Link Device page after login** — checked every time `me` is called via the route guard, not a one-time onboarding flag.
- **One device per user.** Multi-device support (`devices` array) is deferred to Phase 5.

### Collection-per-device architecture (CONFIRMED, implemented)

Each device lives in its own MongoDB collection on the shared Atlas cluster (`G3036`, and any future device ID). `Reading.js` is a factory, not a static model:

```js
// server/src/models/Reading.js
function getReadingModel(deviceId) {
  return mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId);
}
module.exports = { getReadingModel };
```

Every function in `readingsController.js` resolves its collection via `getReadingModel(req.user.device.deviceId)`. `changeStream.js` also resolves per-device: on startup it loads all seeded `Device` documents and opens one Change Stream per device's collection, rather than watching a single hardcoded collection — this is what lets new devices "just work" for real-time updates once seeded, without touching `changeStream.js` again.

### Device code validation (CONFIRMED, implemented)

A seeded `devices` collection is the source of truth for which device IDs exist and what code proves a user can claim one:

```js
// devices collection, iotdb database
{ deviceId: "G3036", deviceCode: "PROHORI-G3036-7X4K2" }
```

- `POST /api/auth/link-device` validates `{ deviceId, deviceCode }` against this collection.
- New mimic/physical devices each need their own seeded `devices` document — not automatic, a manual step (`node src/seed/seedDevices.js`, safe to re-run, upserts).
- Separate collection from the per-device reading collections — exists purely for the linking/auth flow.

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend
- MongoDB Change Streams — detects new inserts, one watcher per seeded device (see above)
- `bcrypt` — password hashing (cost factor 10)
- `jsonwebtoken` — JWT issuing/verification, 7-day expiry, no refresh-token flow
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Simulator / mimic pipeline**
- `mimic-device/` (Python) — publishes fake sensor readings over MQTT to the real broker
- `mqtt-bridge/` (Python) — subscribes to MQTT, sole writer to per-device reading collections
- `simulator/` — retired (Phase 2 direct-to-Mongo writer), never run concurrently with the MQTT pipeline

**Database**
- MongoDB Atlas, database `iotdb`
- Reading collections keyed per device (currently only `G3036`), resolved dynamically via `getReadingModel(deviceId)` — never hardcode a collection name in new code
- `devices` collection — seeded, validates device linking
- `users` collection — username, email, passwordHash (bcrypt), embedded `device: { deviceId, linkedAt } | null`
- **`server/` is read-only for reading data** — only `mqtt-bridge/` writes to reading collections

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing, full auth + device-link route guarding (see Route Guard Summary below)
- Tailwind CSS — utility-first styling, design tokens live in `client/src/index.css` under `@theme`, matching `DESIGN.md`
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates for the live readings panel
- axios — HTTP client, request interceptor attaches `Authorization: Bearer <token>` from `localStorage` automatically

**Design source:** Stitch-exported designs for the pre-auth pages (Login, Register, Link Device), translated into Tailwind classes and sharing a common `AuthShell.jsx` split-panel layout. The authenticated pages (Dashboard, History, Calendar) predate Stitch conversion for this phase and follow `DESIGN.md`'s tokens directly — see `DESIGN.md`.

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

Rules:
- Never invent fields that aren't in this schema.
- `server/` never writes/inserts/updates documents in reading collections — read-only. Only `mqtt-bridge/` writes.
- Use `created_at` (not `timestamp`) for all date range queries, sorting, and aggregation grouping.
- Reading collections are looked up dynamically via `getReadingModel(deviceId)` — never hardcode `'G3036'` in new controller, hook, or component code. If you see a hardcoded device ID string anywhere in a diff (frontend or backend), that's a regression — the whole point of Phase 4 was eliminating those.
- The `users` and `devices` collections are a separate concern from reading data — plain Mongoose models, no dynamic collection selection needed for them.
- Connection string(s) live in `.env` files — never hardcode, never commit `.env`. `JWT_SECRET` is a locally-generated random secret (e.g. `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`), also never committed and never reused as a fixed/shared value across environments.

## Folder Structure

```
prohori-dashboard/
│
├── server/                        # Express API — reads from MongoDB, serves REST + Socket.IO
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Mongoose connection setup, reads MONGO_URI from .env
│   │   ├── models/
│   │   │   ├── Reading.js         # Factory: getReadingModel(deviceId) — not a static export
│   │   │   ├── User.js            # username, email, passwordHash, device { deviceId, linkedAt } | null
│   │   │   └── Device.js          # Backs the seeded `devices` collection (deviceId, deviceCode)
│   │   ├── controllers/
│   │   │   ├── authController.js       # register, login, me, linkDevice
│   │   │   └── readingsController.js   # getLatest, getHistory, getDailyAverages, getLog,
│   │   │                               #   getCalendar, getDay — all resolve their collection via
│   │   │                               #   getReadingModel(req.user.device.deviceId)
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification logic (safe/warning/danger) — single source of truth
│   │   ├── routes/
│   │   │   ├── auth.js            # /api/auth/register, /login, /me, /link-device
│   │   │   └── readings.js        # requireAuth + requireDevice applied to all reading routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Centralized error handling
│   │   │   └── requireAuth.js     # Verifies JWT, loads user (incl. linked device), attaches req.user;
│   │   │                          #   requireDevice (readings.js) 403s if req.user.device is missing
│   │   ├── seed/
│   │   │   └── seedDevices.js     # One-off/idempotent script: upserts seeded `devices` docs.
│   │   │                          #   Run manually (`node src/seed/seedDevices.js`) per new device.
│   │   ├── sockets/
│   │   │   └── changeStream.js    # Loads all seeded Device docs, opens one Change Stream per device's
│   │   │                          #   collection via getReadingModel(deviceId), emits `new-reading`.
│   │   │                          #   Per-user socket scoping is still deferred to Phase 5 — see below.
│   │   └── app.js                 # Express app setup: middleware, mounts /api/auth + /api/readings,
│   │                              #   CORS, Socket.IO server, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN, JWT_SECRET — gitignored
│   ├── .env.example
│   └── package.json               # includes bcrypt, jsonwebtoken
│
├── mimic-device/                  # Publishes fake sensor readings over MQTT — semi-permanent
│   │                               # stand-in for the physical device, runs against the real broker.
│   ├── generator.py
│   ├── publisher.py
│   ├── run_local_test.py
│   ├── .env / .env.example / README.md / requirements.txt
│
├── mqtt-bridge/                   # Subscribes to MQTT, writes into device reading collections —
│   │                               # the sole writer to those collections.
│   ├── bridge.py
│   ├── .env / .env.example / README.md / requirements.txt
│
├── simulator/                     # RETIRED (Phase 2) — never run concurrently with the MQTT pipeline.
│
├── client/                        # React (Vite) frontend — the dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx           # Nav links (real routes), device status (real deviceId,
│   │   │   │   │                         #   from user.device.deviceId, no hardcoding), logout control
│   │   │   │   └── Header.jsx            # title prop per page, real deviceId via prop, status, last-updated
│   │   │   ├── auth/
│   │   │   │   └── AuthShell.jsx         # Shared split-panel layout for Login/Register/LinkDevice
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx        # One metric's live value
│   │   │   │   ├── ReadingsPanel.jsx     # Grid wrapper laying out the 4 SensorCards
│   │   │   │   ├── HistoryTable.jsx      # Paginated table, used on /history (server-side pagination)
│   │   │   │   ├── HistoryTabs.jsx       # 7d/30d toggle — Dashboard chart only, NOT on /history
│   │   │   │   └── TrendChart.jsx        # Recharts line chart — plots DAILY AVERAGES
│   │   │   │                             #   (ammonia_avg/methane_avg/date), not raw readings
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx      # Month-view grid, plain/neutral cells, no zone coloring,
│   │   │   │   │                         #   no-data days muted/disabled, prev/next nav
│   │   │   │   └── DayDetailCards.jsx    # Min/max cards per metric on day click; left indicator bar
│   │   │   │                             #   uses the MORE SEVERE of min/max zone, not just min's
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx       # Reusable online/offline colored-dot badge
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # { token, user, loading }, exposes useAuth() with
│   │   │                          #   login/register/logout/setUser; setUser lets pages (e.g.
│   │   │                          #   LinkDevice) update user state directly, no page reload needed
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # `/` — ReadingsPanel (live) + TrendChart (daily averages)
│   │   │   ├── History.jsx        # `/history` — unbounded, paginated reading log, no 7d/30d toggle
│   │   │   ├── Calendar.jsx       # `/calendar` — month grid + min/max drill-down
│   │   │   ├── Login.jsx          # `/login`
│   │   │   ├── Register.jsx       # `/register`
│   │   │   └── LinkDevice.jsx     # `/link-device`
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Socket.IO listener (current reading)
│   │   │   ├── useDeviceStatus.js        # Wraps useLatestReading — derives online/offline
│   │   │   │                             #   (5-min threshold) + lastUpdated; used by Dashboard,
│   │   │   │                             #   History, Calendar for their Header props
│   │   │   ├── useDailyAverages.js       # GET /api/readings/daily-averages?range= — Dashboard chart
│   │   │   ├── useReadingsLog.js         # GET /api/readings/log?page=&limit= — History page
│   │   │   ├── useReadingsHistory.js     # Legacy Phase 1 raw-history hook — no longer used by any
│   │   │   │                             #   page as of this cleanup; kept for now, candidate for removal
│   │   │   ├── useCalendarData.js        # GET /api/readings/calendar?month= — Calendar grid
│   │   │   └── useDayDetail.js           # GET /api/readings/day/:date — Calendar drill-down;
│   │   │                                 #   no-op (no fetch) when date is null
│   │   ├── services/
│   │   │   ├── api.js              # axios instance + interceptor (attaches Bearer token from
│   │   │   │                       #   localStorage), all auth + reading endpoint wrappers
│   │   │   └── socket.js           # Socket.IO client instance/connection setup
│   │   ├── App.jsx                # BrowserRouter + route guards: RequireAuth (with optional
│   │   │                          #   requireDevice / redirectLinkedDevice flags) and
│   │   │                          #   RedirectIfAuthed — see Route Guard Summary below
│   │   ├── main.jsx                # Vite/React entry point, wraps <App/> in <AuthProvider>
│   │   └── index.css              # Tailwind directives + @theme tokens (matches DESIGN.md)
│   ├── .env / .env.example         # VITE_API_URL
│   └── package.json
│
├── AGENTS.md                      # This file — stack, schema, conventions, folder guide
├── PAGES.md                       # Screen/section breakdown for the current phase
├── DESIGN.md                      # Stitch design output translated into design tokens/specs
└── README.md                      # Setup instructions
```

## Route Guard Summary (implemented in `App.jsx`)

| State | `/`, `/history`, `/calendar` | `/link-device` | `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | shown |
| Authenticated, no device linked | → `/link-device` | shown | → `/` |
| Authenticated, device linked | shown | → `/` | → `/` |

While `AuthContext`'s initial `/api/auth/me` check is in flight (`loading: true`), a minimal loading state renders instead of any redirect, to avoid a flash of the wrong page.

## API Contract

- `POST /api/auth/register` → `{ username, email, password }` → creates user, returns `{ token, user }`
- `POST /api/auth/login` → `{ email, password }` → returns `{ token, user }`; generic "Invalid email or password" on failure, no field-level hinting
- `GET /api/auth/me` → (requires auth) → `{ username, email, device: { deviceId, linkedAt } | null }`
- `POST /api/auth/link-device` → (requires auth) → `{ deviceId, deviceCode }` → validates against `devices`, saves to user, returns `{ user }` (no token — same one from login/register still applies). Already-linked → 409. Wrong code or nonexistent device → same generic "Invalid device ID or code" either way.
- `GET /api/readings/latest` → (requires auth + linked device) → single most recent document + zone classifications
- `GET /api/readings/daily-averages?range=7d|30d` → array of `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }` — **Dashboard chart's actual data source**
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }`, unbounded, newest-first — **History page's actual data source**
- `GET /api/readings/calendar?month=YYYY-MM` → array of `{ date, ammonia_min, ammonia_max, ammonia_min_zone, ammonia_max_zone, methane_min, methane_max, methane_min_zone, methane_max_zone, humidity_min, humidity_max, humidity_min_zone, humidity_max_zone, temperature_min, temperature_max, temperature_min_zone, temperature_max_zone }` per day — min and max classified independently
- `GET /api/readings/day/:date` → full min/max detail for one day (calendar drill-down)
- `GET /api/readings/history?range=7d|30d` → raw readings — **legacy Phase 1 endpoint, no longer called by any frontend page** as of this cleanup; still exists server-side, candidate for deprecation
- `GET /health` → unchanged, no auth required
- **Socket.IO:** `new-reading` — emitted per-device via the Change Stream watchers in `changeStream.js`; still broadcasts globally regardless of which user is connected (per-user scoping deferred to Phase 5, see below — not yet a real leak since there's one device, but flagged before Phase 5 introduces devices other users won't be linked to)

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only.
- Passwords: bcrypt, cost factor 10, never log or return `passwordHash` (also stripped by `User.js`'s `toJSON`/`toObject` transform as a defensive second layer).
- JWT: 7-day expiry, signed with `JWT_SECRET` from `.env`, never hardcoded, never a shared/reused value across environments.
- Frontend stores the token in `localStorage` (key: `prohori_token`) — acceptable for this project's internship-scale threat model.
- Never hardcode a device ID (`"G3036"` or otherwise) anywhere in new frontend or backend code — always resolve it from `req.user.device.deviceId` (backend) or `user.device.deviceId` via `useAuth()` (frontend). This was a recurring regression during Phase 4 cleanup; treat any new instance of it as a bug.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET` in `server/.env`; `VITE_API_URL` in `client/.env`; `MONGO_URI` in `mqtt-bridge/.env` and `mimic-device/.env`. Commit `.env.example` files with placeholders only.
- Keep components small and single-purpose; `hooks/` isolates all data-fetching/real-time logic from UI components.
- Tailwind design tokens live in `client/src/index.css` under `@theme`, mirroring `DESIGN.md` — avoid hardcoding hex values inline in JSX; use named tokens.
- Material Symbols icon names must be verified against the actual Material Symbols set before use — `"thermometer"` is not valid (caught during Calendar review), the correct name is `"thermostat"`.
- When a value is classified into independent sub-zones (e.g. a day's min vs max), any single shared visual indicator (e.g. one colored bar) must reflect the **more severe** of the sub-zones, not an arbitrary one — silently downplaying the worse reading defeats the purpose of independent classification.

## Known Temporary Workarounds (Still Open)

- `getHistory`/`getDailyAverages` still use document-count `.limit()` windowing instead of a genuine `Date.now()`-relative `$gte` filter on `created_at`. Search `TODO(revert-for-production)` in `readingsController.js`.
- `getDailyAverages`'s `$dateToString` grouping has no explicit `timezone` option (defaults to UTC) — unverified for a Bangladesh-based (UTC+6) user; a late-evening BD reading could group into the next UTC day. Note: `formatChartDate` on the frontend (`dateFormatter.js`) parses `YYYY-MM-DD` as local time (via a `T00:00:00` suffix with no `Z`), which avoids a *display*-side shift, but the underlying day-boundary grouping on the backend is still UTC-based and unverified.
- `useReadingsHistory.js` (frontend) is now unused dead code — no page calls it since the Stage C cleanup. Candidate for removal once confirmed nothing else depends on it.
- `GET /api/readings/history` (backend) is likewise now unused by the frontend — candidate for deprecation, kept for now in case anything external still calls it.

## Out of Scope (Deferred to Phase 5 or later)

- Multiple devices per user / a device switcher (`device` object → `devices` array)
- Scoping Socket.IO `new-reading` delivery to only the connected user's linked device(s)
- Unlink / re-link device flow
- Password reset / email verification flows
- Role-based access (admin vs regular user)
- OAuth / third-party login
- Push/email/SMS notifications for threshold alerts (still visual/in-dashboard only)
- Export/download data feature
- Login timing-side-channel hardening (dummy-hash comparison when no user is found) — noted during Stage A review as low-priority given the project's internship-scale threat model

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting speced, unbounded reading log speced, calendar min/max view speced. Three routed pages instead of one. *(Note: the daily-average chart, unbounded log, and calendar frontend were speced here but not actually wired/built until the Phase 4 cleanup below — the backend endpoints existed, but Dashboard/History kept using older endpoints and Calendar had no frontend at all until now.)*
- **Phase 3 (COMPLETE)**: Replaced the direct-to-Mongo simulator with a real MQTT pipeline (`mimic-device/` + `mqtt-bridge/`), verified end-to-end including live Socket.IO delivery.
- **Phase 4 (COMPLETE)**: Authentication (register/login via JWT + bcrypt) and single-device linking per user. `Reading` model became a factory keyed by device ID. Device-code validation via a seeded `devices` collection. `changeStream.js` updated to watch all seeded devices' collections instead of one hardcoded collection (hotfix, required by the Reading factory change). Full frontend: `AuthContext`, Login/Register/LinkDevice pages (Stitch-converted, shared `AuthShell`), route guarding matching the table above, Sidebar logout, all device-ID references made dynamic (`user.device.deviceId`) across Sidebar, Header, and both mobile/desktop views. **Alongside Phase 4**, closed two outstanding Phase 2 frontend gaps: Dashboard chart and History page rewired from Phase 1 endpoints to `daily-averages`/`log`; Calendar page built end-to-end (grid + min/max drill-down, with a zone-severity fix so the drill-down cards' indicator reflects the worse of min/max rather than always min). Multi-device per user, per-user socket scoping, and everything else listed under "Out of Scope" above remain deferred to Phase 5.