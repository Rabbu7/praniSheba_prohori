# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 5 — COMPLETE

Phase 5 was deliberately small and had four stages, all done:

1. **5a — Docs** (`AGENTS.md` + `PAGES.md`). ✅
2. **5b — Unique device ownership + device seeding.** Six devices exist (G3036, G3037, G3038, G3040, G3041, G3042). A device can be linked by **only one account**, enforced by a database unique index (not just a controller check). ✅
3. **5c — Multi-device MQTT.** `mimic-device/` publishes for all six devices; `mqtt-bridge/` routes each message to the right collection and rejects unknown device IDs. ✅
4. **5d — Socket.IO per-device rooms.** `new-reading` is delivered only to sockets belonging to users linked to that device, and sockets must present a valid JWT in the handshake. ✅

**Still one device per user.** Multi-device per user, a device switcher, and unlink/re-link remain out of scope (candidates for a future phase).

### Flow (unchanged from Phase 4)

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

### Devices

Six devices, each with its own reading collection on the shared Atlas cluster (`iotdb`) and its own seeded `devices` document:

| Device ID | Device Code |
|---|---|
| G3036 | PROHORI-G3036-7X4K2 |
| G3037 | PROHORI-G3037-9M2QF |
| G3038 | PROHORI-G3038-4TC8W |
| G3040 | PROHORI-G3040-2XJ7R |
| G3041 | PROHORI-G3041-V5K9D |
| G3042 | PROHORI-G3042-H6N3B |

- All codes are arbitrary (no physical devices yet); they are hardcoded in `server/src/seed/seedDevices.js`, which upserts and is safe to re-run: `node src/seed/seedDevices.js`.
- **Seed before starting the server** — `changeStream.js` loads seeded devices once at startup. If devices are seeded while the server is running, restart the server. (The MQTT bridge refreshes its own allowed list every 60s, so it does not need a restart.)
- Reading collections for G3037, G3038, G3040, G3041 and G3042 are created automatically by MongoDB on first insert (by `mqtt-bridge/`).

**G3039 is deliberately NOT used.** A `G3039` collection already exists on the shared cluster with real historical data (Aug 2024, 1,379 documents). Never write to it, and never add it to `seedDevices.js` or `DEVICE_IDS`. The bridge drops any message for `G3039` because it is not in the seeded `devices` collection. Before adding any further device ID, confirm no collection with that name exists in `iotdb` (the cluster is shared and also holds unrelated collections such as `G3029`, `G3035` and Django tables — never touch those).

### One account per device (CONFIRMED design, implemented)

- `User.js` has a **unique partial index** on `device.deviceId` with `partialFilterExpression: { 'device.deviceId': { $type: 'string' } }`. A plain `sparse` unique index is NOT acceptable (users with `device: null` must not collide).
- Uniqueness is enforced by the database, so two simultaneous link attempts cannot both succeed. Do **not** implement this as find-then-save.
- `linkDevice` order of checks:
  1. Validate input, then validate `{ deviceId, deviceCode }` against the `devices` collection → failure: generic "Invalid device ID or code" (never says which field was wrong).
  2. User already has a device → 409.
  3. Save; catch duplicate-key error (`err.code === 11000`) → 409 "This device is already linked to another account".
- The "already linked" message is only reachable *after* a correct code is supplied, so it does not leak which device IDs exist.
- Note: a user who already has a device and submits a wrong code gets the generic error (not 409), because code validation runs first. This is intended; the route guard redirects such users away from `/link-device` anyway.
- If an existing database ever has two users sharing a linked device, the index build fails; clear the duplicate manually first.
- The seed script calls `syncIndexes()`, which drops any index not declared in the schema. Declare every index in the schema; do not add indexes by hand in Compass.

### Collection-per-device architecture (unchanged)

`Reading.js` is a factory, not a static model:

```js
// server/src/models/Reading.js
function getReadingModel(deviceId) {
  return mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId);
}
module.exports = { getReadingModel };
```

Every function in `readingsController.js` resolves its collection via `getReadingModel(req.user.device.deviceId)`. `changeStream.js` opens one Change Stream per seeded device.

### Multi-device MQTT (implemented)

- Topic pattern: `prohori/<deviceId>/reading` (e.g. `prohori/G3037/reading`).
- **`mimic-device/`**: reads `DEVICE_IDS` (comma-separated, trimmed, empty entries ignored; e.g. `G3036,G3037,G3038,G3040,G3041,G3042`) from `.env` and fails with a clear error if empty. One process, one MQTT client (`client_id` `prohori-mimic-publisher`), publishes one reading per device per interval (QoS 1, non-retained). **Each device keeps its own random-walk state** and starts from slightly different values (`initial_state(index)`), so devices drift independently. `run_local_test.py` prints generator output for all configured IDs without needing a broker.
- **`mqtt-bridge/`**: subscribes to `prohori/+/reading` (QoS 1). A `DeviceRegistry` loads allowed IDs from `iotdb.devices` at startup and refreshes every 60s. For each message the device ID is taken from the **topic**, never from the payload; IDs not in the registry are **dropped** with one warning line and nothing is written (no collection is ever created for an unknown ID). The payload must be a JSON object with numeric `ammonia`, `methane`, `humidity`, `temperature` and a numeric `timestamp`; malformed payloads are dropped and logged. The document is inserted into the collection named exactly by the topic's device ID, with `device_id` forced to match it and `created_at` set by the bridge (UTC). The bridge remains the **sole writer** to reading collections.
- The abandoned topic `farm_controller/CATTLE_CTRL_001/event` must never be used.
- Never run `simulator/` and the MQTT pipeline at the same time.

### Socket.IO per-device rooms (implemented)

- **Server** (`sockets/socketAuth.js`, registered with `io.use(socketAuth)` in `app.js`): verifies the JWT from `socket.handshake.auth.token` with `JWT_SECRET`, loads the user, and rejects the handshake if the token is missing, invalid or expired, the user does not exist, or the user has no linked device. All rejections use the same generic message ("Authentication required"). On success it sets `socket.data.userId` and `socket.data.deviceId`.
- On connection the server joins the socket to room `device:<deviceId>`.
- `changeStream.js` emits `new-reading` with `io.to('device:' + deviceId).emit(...)`, where `deviceId` comes from the watched collection, never from the document payload. There must be no global `io.emit` for reading data anywhere in `server/`.
- **Client** (`services/socket.js`): the socket is created with `autoConnect: false`. `connectSocket(token)` connects, or reconnects if the token changed; `disconnectSocket()` closes the connection. `useLatestReading.js` connects only when both `token` and `user.device.deviceId` exist, so an unlinked or logged-out user never has a socket. Logout (in `AuthContext`) must call `disconnectSocket()` so a logged-out browser does not keep an authenticated connection (this applies from any page, not only the Dashboard).
- `useLatestReading`'s return shape (`{ data, loading, error }`) is unchanged, so no component changes.
- Because a device can only be linked by one account, each room has at most one user.
- Known limitation: the JWT is verified only at handshake time; an already-open socket keeps working after the token expires (7-day expiry). Acceptable for now.

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend (JWT-authenticated, per-device rooms)
- MongoDB Change Streams — detects new inserts, one watcher per seeded device
- `bcrypt` — password hashing (cost factor 10)
- `jsonwebtoken` — JWT issuing/verification, 7-day expiry, no refresh-token flow
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Device pipeline**
- `mimic-device/` (Python) — publishes fake sensor readings over MQTT to the real broker, for all six devices
- `mqtt-bridge/` (Python) — subscribes to MQTT, sole writer to per-device reading collections
- `simulator/` — retired (Phase 2 direct-to-Mongo writer), never run concurrently with the MQTT pipeline

**Database**
- MongoDB Atlas, database `iotdb`
- Reading collections keyed per device (G3036, G3037, G3038, G3040, G3041, G3042), resolved dynamically via `getReadingModel(deviceId)` — never hardcode a collection name in new code
- `devices` collection — seeded, validates device linking and the bridge's allowed list
- `users` collection — username, email, passwordHash (bcrypt), embedded `device: { deviceId, linkedAt } | null`, with unique partial index on `device.deviceId`
- **`server/` is read-only for reading data** — only `mqtt-bridge/` writes to reading collections

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing, auth + device-link route guarding
- Tailwind CSS — utility-first styling, design tokens in `client/src/index.css` under `@theme`, matching `DESIGN.md`
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates for the live readings panel
- axios — HTTP client, request interceptor attaches `Authorization: Bearer <token>` from `localStorage`

**Design source:** Stitch-exported designs for the pre-auth pages (Login, Register, Link Device), sharing a common `AuthShell.jsx`. Authenticated pages follow `DESIGN.md`'s tokens directly.

## Data Source — DO NOT GUESS FIELD NAMES

Database: `iotdb`
Collection: keyed per device — `G3036`, `G3037`, `G3038`, `G3040`, `G3041`, `G3042`

Document shape (confirmed from live data, do not alter):

```js
{
  _id: ObjectId,
  device_id: String,       // "G3036", "G3037", "G3038", "G3040", "G3041" or "G3042"
  ammonia: Number,         // Double, ppm
  methane: Number,         // Double, ppm
  humidity: Number,        // Int — percent (%)
  temperature: Number,     // Int, likely °F
  timestamp: Number,       // Unix epoch seconds, set by device/mimic device
  created_at: Date         // ISODate, set by DB insert (mqtt-bridge) — use this for sorting/filtering, not `timestamp`
}
```

Rules:
- Never invent fields that aren't in this schema.
- `server/` never writes/inserts/updates documents in reading collections — read-only. Only `mqtt-bridge/` writes.
- Use `created_at` (not `timestamp`) for all date range queries, sorting, and aggregation grouping.
- Reading collections are looked up dynamically via `getReadingModel(deviceId)` — never hardcode a device ID string (e.g. `'G3036'`) in controller, hook, or component code. Hardcoded device IDs in a diff are a regression. (Exceptions: `seedDevices.js`, and `.env` / `.env.example` values for `mimic-device/`.)
- The `users` and `devices` collections are plain Mongoose models, no dynamic collection selection.
- Connection strings live in `.env` files — never hardcode, never commit `.env`. `JWT_SECRET` is a locally-generated random secret, never committed, never shared across environments.
- Never write to, seed, or add to `DEVICE_IDS` any ID whose collection already exists on the cluster for other reasons (notably `G3039`).

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
│   │   │   │                      #   + unique PARTIAL index on device.deviceId
│   │   │   └── Device.js          # Backs the seeded `devices` collection (deviceId, deviceCode)
│   │   ├── controllers/
│   │   │   ├── authController.js       # register, login, me, linkDevice (409 on duplicate key)
│   │   │   └── readingsController.js   # getLatest, getHistory, getDailyAverages, getLog,
│   │   │                               #   getCalendar, getDay — all via getReadingModel(req.user.device.deviceId)
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification (safe/warning/danger) — single source of truth
│   │   ├── routes/
│   │   │   ├── auth.js            # /api/auth/register, /login, /me, /link-device
│   │   │   └── readings.js        # requireAuth + requireDevice on all reading routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Centralized error handling
│   │   │   └── requireAuth.js     # Verifies JWT, loads user, attaches req.user
│   │   ├── seed/
│   │   │   └── seedDevices.js     # Idempotent upsert of the 6 seeded `devices` docs
│   │   ├── sockets/
│   │   │   ├── changeStream.js    # One Change Stream per seeded device; emits `new-reading` to room
│   │   │   │                      #   `device:<deviceId>` only
│   │   │   └── socketAuth.js      # io.use middleware: JWT handshake auth, sets socket.data.deviceId
│   │   └── app.js                 # Express setup, mounts routes, CORS, Socket.IO server with
│   │                              #   socketAuth + room join on connection, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN, JWT_SECRET — gitignored
│   ├── .env.example
│   └── package.json
│
├── mimic-device/                  # Publishes fake readings over MQTT for all six devices
│   ├── generator.py               # Per-device random-walk state, initial_state(index)
│   ├── publisher.py               # Reads DEVICE_IDS; publishes to prohori/<id>/reading
│   ├── run_local_test.py          # Broker-free sample output for all configured IDs
│   ├── .env / .env.example / README.md / requirements.txt   # DEVICE_IDS=G3036,G3037,G3038,G3040,G3041,G3042
│
├── mqtt-bridge/                   # Subscribes to prohori/+/reading, validates device ID against seeded
│   │                               # `devices` (refreshed every 60s), writes to that device's collection — sole writer.
│   ├── bridge.py
│   ├── .env / .env.example / README.md / requirements.txt
│
├── simulator/                     # RETIRED (Phase 2) — never run concurrently with the MQTT pipeline.
│
├── client/                        # React (Vite) frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Sidebar.jsx, Header.jsx
│   │   │   ├── auth/              # AuthShell.jsx
│   │   │   ├── dashboard/         # SensorCard, ReadingsPanel, HistoryTable, HistoryTabs, TrendChart
│   │   │   ├── calendar/          # CalendarGrid, DayDetailCards (indicator uses MORE SEVERE of min/max)
│   │   │   └── common/            # StatusBadge
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # { token, user, loading }; useAuth() with login/register/logout/setUser;
│   │   │                          #   logout also disconnects the socket
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # `/`
│   │   │   ├── History.jsx        # `/history`
│   │   │   ├── Calendar.jsx       # `/calendar`
│   │   │   ├── Login.jsx          # `/login`
│   │   │   ├── Register.jsx       # `/register`
│   │   │   └── LinkDevice.jsx     # `/link-device` — shows 409 "already linked" error inline
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Socket.IO listener; connects only when token + linked device exist
│   │   │   ├── useDeviceStatus.js
│   │   │   ├── useDailyAverages.js
│   │   │   ├── useReadingsLog.js
│   │   │   ├── useReadingsHistory.js     # Legacy, unused — removal candidate
│   │   │   ├── useCalendarData.js
│   │   │   └── useDayDetail.js
│   │   ├── services/
│   │   │   ├── api.js              # axios instance + Bearer interceptor, endpoint wrappers
│   │   │   └── socket.js           # Socket.IO client (autoConnect:false); connectSocket/disconnectSocket;
│   │   │                           #   passes JWT in handshake `auth`
│   │   ├── App.jsx                # BrowserRouter + route guards (see table below)
│   │   ├── main.jsx
│   │   └── index.css              # Tailwind + @theme tokens
│   ├── .env / .env.example         # VITE_API_URL
│   └── package.json
│
├── AGENTS.md
├── PAGES.md
├── DESIGN.md
└── README.md
```

## Route Guard Summary (implemented in `App.jsx`, unchanged)

| State | `/`, `/history`, `/calendar` | `/link-device` | `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | shown |
| Authenticated, no device linked | → `/link-device` | shown | → `/` |
| Authenticated, device linked | shown | → `/` | → `/` |

While `AuthContext`'s initial `/api/auth/me` check is in flight (`loading: true`), a minimal loading state renders instead of any redirect.

## API Contract

- `POST /api/auth/register` → `{ username, email, password }` → `{ token, user }`
- `POST /api/auth/login` → `{ email, password }` → `{ token, user }`; generic "Invalid email or password" on failure
- `GET /api/auth/me` → (auth) → `{ username, email, device: { deviceId, linkedAt } | null }`
- `POST /api/auth/link-device` → (auth) → `{ deviceId, deviceCode }`:
  - success → `{ user }`
  - wrong code or nonexistent device → generic "Invalid device ID or code"
  - user already has a device → 409
  - device already linked to another account → 409 "This device is already linked to another account" (only reachable after a correct code)
- `GET /api/readings/latest` → (auth + device) → most recent document + zones
- `GET /api/readings/daily-averages?range=7d|30d` → `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }[]` — Dashboard chart source
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }` — History source
- `GET /api/readings/calendar?month=YYYY-MM` → per-day min/max with independently classified zones
- `GET /api/readings/day/:date` → min/max detail for one day
- `GET /api/readings/history?range=7d|30d` → legacy raw readings, unused by frontend, deprecation candidate
- `GET /health` → no auth
- **Socket.IO:** handshake requires a valid JWT in `auth.token` (rejections: "Authentication required"); server joins the socket to `device:<deviceId>`. `new-reading` is emitted per-device to that room only. Payload shape matches `/api/readings/latest`.

## Conventions

- Backend: controller/route separation, async/await with try/catch, centralized error middleware, no business logic in route files.
- Frontend: functional components + hooks only. Tailwind utility classes only.
- Passwords: bcrypt cost 10; never log or return `passwordHash`.
- JWT: 7-day expiry, signed with `JWT_SECRET`; frontend stores it in `localStorage` (`prohori_token`).
- Never hardcode a device ID in app code — resolve from `req.user.device.deviceId` (backend) or `user.device.deviceId` via `useAuth()` (frontend).
- Uniqueness and other integrity rules belong in the database (indexes), not only in controllers.
- Never use `io.emit` for reading data; always target a `device:<deviceId>` room. Derive the room's device ID from the source collection/stream, not from a payload.
- The MQTT bridge must validate device IDs (taken from the topic) against the seeded `devices` collection before writing.
- Logout must disconnect the Socket.IO client.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET` in `server/.env`; `VITE_API_URL` in `client/.env`; `MONGO_URI` + broker settings (and `DEVICE_IDS` for mimic) in `mqtt-bridge/.env` and `mimic-device/.env`. Commit `.env.example` with placeholders only; confirm no `.env` is tracked (`git status`).
- Keep components small and single-purpose; `hooks/` isolates data-fetching/real-time logic.
- Tailwind tokens live in `index.css` under `@theme`, mirroring `DESIGN.md`; no inline hex values in JSX.
- Material Symbols icon names must be verified (`"thermostat"`, not `"thermometer"`).
- When a value has independently classified sub-zones (min vs max), a single shared indicator must reflect the **more severe** one.
- Dev tip: if the server fails with `EADDRINUSE` on port 5000, another `node` process (often a leftover agent-started server) holds the port — find it with `netstat -ano | findstr :5000` and stop it with `taskkill /PID <pid> /F`.

## Threshold / Alert Logic (ACTIVE, unchanged)

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

Implementation notes:
- **Humidity and temperature are two-sided** — both too low AND too high are unsafe.
- **Methane has a large gap** between its warning ceiling (5,000 ppm) and danger floor (50,000 ppm) — implement exactly as given; do not interpolate an extra band unless the company clarifies otherwise.
- Zone classification is computed **server-side**; the frontend just renders a `zone` field.
- Daily averages: zone is computed off the **averaged** value per day.
- Calendar min/max: **min and max are classified independently** per metric per day.
- Visual indication only — no push notifications, email, SMS, or sound alerts.
- If the company revises any threshold values, update this table first — it's the source of truth.

## Known Temporary Workarounds (Still Open)

- `getHistory`/`getDailyAverages` still use document-count `.limit()` windowing instead of a `Date.now()`-relative `$gte` filter on `created_at`. Search `TODO(revert-for-production)` in `readingsController.js`.
- `getDailyAverages`'s `$dateToString` grouping has no `timezone` option (UTC); unverified for UTC+6 users (may need `timezone: "Asia/Dhaka"`).
- `useReadingsHistory.js` and `GET /api/readings/history` are unused — removal/deprecation candidates.
- Socket JWT is only checked at handshake (see Socket.IO section).

## Out of Scope (Deferred beyond Phase 5)

- Multiple devices per user / device switcher (`device` object → `devices` array)
- Unlink / re-link device flow (including releasing a device so another account can claim it)
- Password reset / email verification
- Role-based access
- OAuth / third-party login
- Push/email/SMS notifications for threshold alerts
- Export/download data feature
- Login timing-side-channel hardening
- Periodic re-validation of socket JWTs

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python simulator, daily-average charting, unbounded log, calendar min/max view speced. (Frontend for several of these was only wired during the Phase 4 cleanup.)
- **Phase 3 (COMPLETE)**: MQTT pipeline (`mimic-device/` + `mqtt-bridge/`) replaced the direct-to-Mongo simulator.
- **Phase 4 (COMPLETE)**: JWT/bcrypt auth, single-device linking, `Reading` factory keyed by device ID, seeded `devices` collection, multi-collection Change Streams, full auth frontend and route guards, plus Phase 2 frontend gap cleanup.
- **Phase 5 (COMPLETE)**: Six devices (G3036, G3037, G3038, G3040, G3041, G3042; G3039 skipped because a real collection exists); one-account-per-device enforced by a unique partial index; multi-device MQTT (mimic publishes all six, bridge routes by topic and validates against seeded devices); Socket.IO delivery scoped to per-device rooms with JWT handshake auth; socket disconnects on logout. Still one device per user.