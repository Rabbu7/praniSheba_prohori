# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 6 — COMPLETE (multiple devices per user)

Phase 6 lets **one user own several devices**, add more at any time with an "Add device" action, and switch between them. All stages are done and verified:

1. **6a — Docs** (`AGENTS.md` + `PAGES.md`). ✅
2. **6b — Backend model and API.** `User.js` (`device` → `devices` array), `migrateDevices.js`, `authController.js` (`linkDevice`, `me`, `publicUser`), `resolveDevice` middleware, `readings.js` + `readingsController.js` read `req.deviceId`. ✅
3. **6c — Sockets.** `socketAuth.js` loads all of the user's device IDs; `app.js` joins one room per device. ✅
4. **6d — Frontend.** Delivered in two checkpoints. ✅
   - **6d-1:** `DeviceContext`, `api.js` `deviceId` arguments, the five data hooks, route guards, `LinkDevice` error-message fix and add-mode, socket reconnect after linking.
   - **6d-2:** `DeviceSwitcher.jsx` in the desktop header, mobile top bar (History/Calendar) and Dashboard mobile sub-bar, Cancel link on Add device, `DeviceContext` reset on logout.

**Out of scope (still):** unlink / re-link (a device added by mistake stays on that account), device limit per account (there is none), device nicknames, admin tools. See "Out of Scope".

### Flow

```
Register (username, email, password)
      ↓
Login (returns JWT)
      ↓
GET /api/auth/me → does this user have at least one device in `devices`?
      │
      ├── NO  → Link Device page (first device; no Cancel link)
      │            → on success, device saved and selected → Dashboard
      │
      └── YES → Dashboard for the SELECTED device
                   │
                   ├── Header switcher → pick another owned device → all pages show that device
                   └── Header switcher → "Add device" → Link Device page (with Cancel link)
                                           → on success, new device selected → Dashboard
```

### Devices

Six seeded devices, each with its own reading collection on the shared Atlas cluster (`iotdb`) and its own seeded `devices` document:

| Device ID | Device Code |
|---|---|
| G3036 | PROHORI-G3036-7X4K2 |
| G3037 | PROHORI-G3037-9M2QF |
| G3038 | PROHORI-G3038-4TC8W |
| G3040 | PROHORI-G3040-2XJ7R |
| G3041 | PROHORI-G3041-V5K9D |
| G3042 | PROHORI-G3042-H6N3B |

- All codes are arbitrary (no physical devices yet); they are hardcoded in `server/src/seed/seedDevices.js`, which upserts and is safe to re-run: `node src/seed/seedDevices.js`.
- **Seed before starting the server** — `changeStream.js` loads seeded devices once at startup. If devices are seeded while the server is running, restart the server. (The MQTT bridge refreshes its own allowed list every 60s.)
- Reading collections for G3037, G3038, G3040, G3041 and G3042 are created automatically by MongoDB on first insert (by `mqtt-bridge/`).

**G3039 is deliberately NOT used.** A `G3039` collection already exists on the shared cluster with real historical data (Aug 2024, 1,379 documents). Never write to it, and never add it to `seedDevices.js` or `DEVICE_IDS`. The bridge drops any message for `G3039` because it is not in the seeded `devices` collection. Before adding any further device ID, confirm no collection with that name exists in `iotdb` (the cluster is shared and also holds unrelated collections such as `G3029`, `G3035` and Django tables — never touch those).

### Multiple devices per user (implemented)

**Data model**
- `User.devices` is an array of `{ deviceId, linkedAt }`, default `[]`. The old `User.device` field no longer exists anywhere.
- `User.js` has a **unique partial index** on `devices.deviceId` with `partialFilterExpression: { 'devices.deviceId': { $type: 'string' } }`. A multikey unique index guarantees **no two accounts can own the same device**. Declare it in the schema only (no hand-made indexes in Compass).
- A multikey unique index does **not** stop the *same* user adding the same device twice, so linking uses one atomic update, never find-then-save:

```js
User.updateOne(
  { _id: req.user._id, 'devices.deviceId': { $ne: deviceId } },
  { $push: { devices: { deviceId, linkedAt: new Date() } } }
)
```

  `matchedCount === 0` means the user already owns that device.
- There is **no limit** on devices per account.

**Migration (done once)**
- `server/src/seed/migrateDevices.js` is idempotent: users with a non-null `device` get `devices: [device]` and the old field is `$unset`; users with `device: null` get `devices: []`. Safe to re-run. After it, `node src/seed/seedDevices.js` (which calls `syncIndexes()`) swaps the old `device.deviceId` index for the new one.

**Which device does a request mean?**
- Every `/api/readings/*` endpoint accepts an optional `?deviceId=` query parameter.
- `server/src/middleware/resolveDevice.js` (replaced `requireDevice`) runs after `requireAuth`:
  1. User has no devices → 403 "No device linked".
  2. `?deviceId=` present but not in `req.user.devices` (or not a string) → 403 "Device not found for this account" (same message whether or not the device exists).
  3. `?deviceId=` missing → default to the user's **first** device.
  4. Sets `req.deviceId`.
- Controllers call `getReadingModel(req.deviceId)`. **Never** use `req.user.device` and never accept a device ID from anywhere except through `resolveDevice`.

**`linkDevice` order of checks**
1. Validate input, then validate `{ deviceId, deviceCode }` against the `devices` collection → failure: 400 generic "Invalid device ID or code" (never says which field was wrong).
2. Atomic `$push` with the `$ne` filter. No match → 409 "You have already added this device".
3. Duplicate-key error (`err.code === 11000`) → 409 "This device is already linked to another account".
4. Success → `{ user }` with the full `devices` array.

Both 409 messages are only reachable *after* a correct code is supplied, so they do not leak which device IDs exist.

**Auth payloads**
- `publicUser(user)` and `GET /api/auth/me` return `{ username, email, devices }` where `devices` is always an array (`[]` when none).

**Error shape:** the server returns errors as `{ error: { message, status } }`. Client code must read `err.response?.data?.error?.message`.

### Collection-per-device architecture (unchanged)

`Reading.js` is a factory, not a static model:

```js
// server/src/models/Reading.js
function getReadingModel(deviceId) {
  return mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId);
}
module.exports = { getReadingModel };
```

Every function in `readingsController.js` resolves its collection via `getReadingModel(req.deviceId)`. `changeStream.js` opens one Change Stream per seeded device.

### Multi-device MQTT (unchanged)

- Topic pattern: `prohori/<deviceId>/reading` (e.g. `prohori/G3037/reading`).
- **`mimic-device/`**: reads `DEVICE_IDS` (comma-separated, trimmed, empty entries ignored) from `.env` and fails with a clear error if empty. One process, one MQTT client (`client_id` `prohori-mimic-publisher`), publishes one reading per device per interval (QoS 1, non-retained). **Each device keeps its own random-walk state** and starts from slightly different values (`initial_state(index)`). `run_local_test.py` prints generator output without a broker.
- **`mqtt-bridge/`**: subscribes to `prohori/+/reading` (QoS 1). A `DeviceRegistry` loads allowed IDs from `iotdb.devices` at startup and refreshes every 60s. The device ID is taken from the **topic**, never the payload; unknown IDs are **dropped** with one warning and nothing is written. The payload must be a JSON object with numeric `ammonia`, `methane`, `humidity`, `temperature` and numeric `timestamp`; malformed payloads are dropped and logged. `device_id` is forced to match the topic and `created_at` is set by the bridge (UTC). The bridge remains the **sole writer** to reading collections.
- The abandoned topic `farm_controller/CATTLE_CTRL_001/event` must never be used.
- Never run `simulator/` and the MQTT pipeline at the same time.
- Phase 6 did not touch `mimic-device/` or `mqtt-bridge/`.

### Socket.IO per-device rooms (implemented: one user, many rooms)

- **Server** (`sockets/socketAuth.js`, registered with `io.use(socketAuth)`): verifies the JWT from `socket.handshake.auth.token`, loads the user fresh from the database, and rejects the handshake if the token is missing, invalid or expired, the user does not exist, or the user has **no devices**. All rejections use the same generic message ("Authentication required"). On success it sets `socket.data.userId` and `socket.data.deviceIds` (array of device ID strings). The singular `socket.data.deviceId` no longer exists.
- In `app.js`, on connection the server joins the socket to `device:<id>` for each ID in `socket.data.deviceIds`. IDs come **only** from the server-loaded list, never from the client. There is no client-triggered room-join event.
- `changeStream.js` is unchanged: it emits `new-reading` with `io.to('device:' + deviceId).emit(...)`, where `deviceId` comes from the watched collection. There must be no global `io.emit` for reading data anywhere in `server/`.
- Each device belongs to one account, so each room has at most one user (one user's socket can be in several rooms).
- **Client** (`services/socket.js`): `autoConnect: false`; `connectSocket(token)` connects or reconnects if the token changed; `disconnectSocket()` closes the connection.
- `useLatestReading` connects only when `token` exists and the user owns at least one device, fetches `latest` for the selected device, and **ignores live events whose `payload.device_id !== selectedDeviceId`** (the socket receives every owned device's readings). It clears its data when the selected device changes so the previous device never flashes. Return shape stays `{ data, loading, error }`.
- **After a device is added, `LinkDevice` calls `disconnectSocket()` then `connectSocket(token)`** so the handshake reloads the device list and joins the new room. Verified: an already-open socket does not receive a newly added device's room until it reconnects.
- Logout (in `AuthContext`) calls `disconnectSocket()` and removes the saved selected device (the 401 branch does the same).
- Known limitation: the JWT and device list are verified only at handshake time; an open socket keeps working after the token expires (7-day expiry). Acceptable for now.

### Frontend device selection (implemented)

- `context/DeviceContext.jsx`, mounted in `main.jsx` inside `AuthProvider`. `useDevice()` → `{ devices, selectedDeviceId, selectDevice }`.
  - `devices` = `user?.devices ?? []`.
  - The preferred ID is persisted in `localStorage` under `prohori_selected_device` and held in state. `selectedDeviceId` is derived: the preferred ID if it is in `devices`, otherwise `devices[0]?.deviceId`, otherwise `null`.
  - The in-memory preferred ID is reset when `token` becomes `null` (logout or 401), so a second account in the same tab never inherits the first account's selection. Do **not** reset on `user === null`: `user` is briefly null during page load while `getMe()` is in flight.
  - After a successful link, `LinkDevice` calls `selectDevice(<trimmed submitted id>)` so the new device is selected.
- All reading hooks take the selected device ID, pass it as `?deviceId=` via `api.js` (axios `params`, only when defined), and refetch when it changes: `useLatestReading`, `useDailyAverages`, `useReadingsLog`, `useCalendarData`, `useDayDetail`. They reset data (`null`, or `[]` for calendar) and set loading before refetching, and do not fetch when the device ID is null. History resets to page 1 on switch; Calendar clears its selected day on switch and keeps the viewed month.
- `components/layout/DeviceSwitcher.jsx` is the header dropdown: a button showing the selected ID (monospace) with a chevron; a `role="menu"` listing owned devices (check on the selected one) followed by a divider and an "Add device" row that navigates to `/link-device`. Closes on outside click and Escape; Arrow Up/Down move focus. Renders "—" with no menu when no device is selected.
- `Header.jsx` no longer takes a `deviceId` prop; the desktop header renders `<DeviceSwitcher />`. An optional `mobileSwitcher` prop renders it in the mobile top bar (History and Calendar pass it; Dashboard uses its own mobile sub-bar instead).
- Never hardcode a device ID in the client. Use `selectedDeviceId` from `useDevice()`.

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
- `users` collection — username, email, passwordHash (bcrypt), embedded `devices: [{ deviceId, linkedAt }]`, with unique partial index on `devices.deviceId`
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
- Reading collections are looked up dynamically via `getReadingModel(deviceId)` — never hardcode a device ID string (e.g. `'G3036'`) in controller, hook, or component code. Hardcoded device IDs in a diff are a regression. (Exceptions: `seedDevices.js`, `.env` / `.env.example` values for `mimic-device/`, and placeholder text such as "e.g. G3036" in `LinkDevice.jsx`.)
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
│   │   │   ├── User.js            # username, email, passwordHash, devices [{ deviceId, linkedAt }]
│   │   │   │                      #   + unique PARTIAL index on devices.deviceId
│   │   │   └── Device.js          # Backs the seeded `devices` collection (deviceId, deviceCode)
│   │   ├── controllers/
│   │   │   ├── authController.js       # register, login, me, linkDevice (atomic $push; 409s)
│   │   │   └── readingsController.js   # getLatest, getHistory, getDailyAverages, getLog,
│   │   │                               #   getCalendar, getDay — all via getReadingModel(req.deviceId)
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification (safe/warning/danger) — single source of truth
│   │   ├── routes/
│   │   │   ├── auth.js            # /api/auth/register, /login, /me, /link-device
│   │   │   └── readings.js        # requireAuth + resolveDevice on all reading routes
│   │   ├── middleware/
│   │   │   ├── errorHandler.js    # Centralized error handling
│   │   │   ├── requireAuth.js     # Verifies JWT, loads user, attaches req.user
│   │   │   └── resolveDevice.js   # Validates ?deviceId= against req.user.devices, defaults to first
│   │   │                          #   device, sets req.deviceId
│   │   ├── seed/
│   │   │   ├── seedDevices.js     # Idempotent upsert of the 6 seeded `devices` docs + syncIndexes()
│   │   │   └── migrateDevices.js  # One-time, idempotent user.device → user.devices (already run)
│   │   ├── sockets/
│   │   │   ├── changeStream.js    # One Change Stream per seeded device; emits `new-reading` to room
│   │   │   │                      #   `device:<deviceId>` only
│   │   │   └── socketAuth.js      # io.use middleware: JWT handshake auth, sets socket.data.deviceIds
│   │   └── app.js                 # Express setup, mounts routes, CORS, Socket.IO server with
│   │                              #   socketAuth + one room join per owned device, starts the server
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
│   │   │   ├── layout/            # Sidebar.jsx, Header.jsx, DeviceSwitcher.jsx
│   │   │   ├── auth/              # AuthShell.jsx
│   │   │   ├── dashboard/         # SensorCard, ReadingsPanel, HistoryTable, HistoryTabs, TrendChart
│   │   │   ├── calendar/          # CalendarGrid, DayDetailCards (indicator uses MORE SEVERE of min/max)
│   │   │   └── common/            # StatusBadge
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # { token, user, loading }; useAuth() with login/register/logout/setUser;
│   │   │   │                      #   logout and the 401 branch disconnect the socket and clear the selected device
│   │   │   └── DeviceContext.jsx  # useDevice() → { devices, selectedDeviceId, selectDevice }
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # `/`
│   │   │   ├── History.jsx        # `/history`
│   │   │   ├── Calendar.jsx       # `/calendar`
│   │   │   ├── Login.jsx          # `/login`
│   │   │   ├── Register.jsx       # `/register`
│   │   │   └── LinkDevice.jsx     # `/link-device` — first device AND "Add device"; inline 409/400 errors
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Socket.IO listener filtered by selected device; clears on switch
│   │   │   ├── useDeviceStatus.js
│   │   │   ├── useDailyAverages.js       # takes selected device ID; refetches on change
│   │   │   ├── useReadingsLog.js         # same
│   │   │   ├── useReadingsHistory.js     # Legacy, unused — removal candidate
│   │   │   ├── useCalendarData.js        # takes selected device ID; refetches on change
│   │   │   └── useDayDetail.js           # same
│   │   ├── services/
│   │   │   ├── api.js              # axios instance + Bearer interceptor, endpoint wrappers (optional deviceId arg)
│   │   │   └── socket.js           # Socket.IO client (autoConnect:false); connectSocket/disconnectSocket;
│   │   │                           #   passes JWT in handshake `auth`
│   │   ├── App.jsx                # BrowserRouter + route guards (see table below)
│   │   ├── main.jsx               # AuthProvider > DeviceProvider > App
│   │   └── index.css              # Tailwind + @theme tokens
│   ├── .env / .env.example         # VITE_API_URL
│   └── package.json
│
├── AGENTS.md
├── PAGES.md
├── DESIGN.md
└── README.md
```

## Route Guard Summary (implemented in `App.jsx`)

| State | `/`, `/history`, `/calendar` | `/link-device` | `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | shown |
| Authenticated, no device | → `/link-device` | shown (first device, no Cancel) | → `/` |
| Authenticated, one or more devices | shown | shown (Add device, with Cancel → `/`) | → `/` |

"Has a device" means `user.devices.length > 0`. `RequireAuth` has no `redirectLinkedDevice` behavior any more. While `AuthContext`'s initial `/api/auth/me` check is in flight (`loading: true`), a minimal loading state renders instead of any redirect.

## API Contract

- `POST /api/auth/register` → `{ username, email, password }` → `{ token, user }`
- `POST /api/auth/login` → `{ email, password }` → `{ token, user }`; generic "Invalid email or password" on failure
- `GET /api/auth/me` → (auth) → `{ username, email, devices: [{ deviceId, linkedAt }] }` (`devices` is `[]` when none)
- `POST /api/auth/link-device` → (auth) → `{ deviceId, deviceCode }`:
  - success → `{ user }` (full `devices` array)
  - wrong code or nonexistent device → 400 generic "Invalid device ID or code"
  - user already owns this device → 409 "You have already added this device"
  - device already linked to another account → 409 "This device is already linked to another account" (only reachable after a correct code)
- All `/api/readings/*` endpoints take an optional `?deviceId=`; missing → user's first device; not owned → 403 "Device not found for this account"; no devices → 403 "No device linked".
- `GET /api/readings/latest` → (auth + device) → most recent document + zones
- `GET /api/readings/daily-averages?range=7d|30d` → `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }[]` — Dashboard chart source
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }` — History source
- `GET /api/readings/calendar?month=YYYY-MM` → per-day min/max with independently classified zones
- `GET /api/readings/day/:date` → min/max detail for one day
- `GET /api/readings/history?range=7d|30d` → legacy raw readings, unused by frontend, deprecation candidate
- `GET /health` → no auth
- **Socket.IO:** handshake requires a valid JWT in `auth.token` (rejections: "Authentication required"); server joins the socket to `device:<id>` for **every** device the user owns. `new-reading` is emitted per-device to that room only. Payload shape matches `/api/readings/latest` (includes `device_id`; the client filters on it).

## Conventions

- Backend: controller/route separation, async/await with try/catch, centralized error middleware, no business logic in route files.
- Frontend: functional components + hooks only. Tailwind utility classes only.
- Passwords: bcrypt cost 10; never log or return `passwordHash`.
- JWT: 7-day expiry, signed with `JWT_SECRET`; frontend stores it in `localStorage` (`prohori_token`). The selected device is stored under `prohori_selected_device`.
- Never hardcode a device ID in app code — resolve from `req.deviceId` (backend, set by `resolveDevice`) or `selectedDeviceId` via `useDevice()` (frontend).
- Never read `req.user.device` or `user.device` (removed in Phase 6). Use `req.user.devices` for ownership checks only.
- Uniqueness and other integrity rules belong in the database (indexes) and atomic updates, not only in controllers. Do not implement "already added" as find-then-save.
- Never use `io.emit` for reading data; always target a `device:<deviceId>` room. Derive the room's device ID from the source collection/stream, not from a payload.
- The MQTT bridge must validate device IDs (taken from the topic) against the seeded `devices` collection before writing.
- Logout must disconnect the Socket.IO client and clear the saved selected device.
- Client code reads server errors from `err.response?.data?.error?.message`.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET` in `server/.env`; `VITE_API_URL` in `client/.env`; `MONGO_URI` + broker settings (and `DEVICE_IDS` for mimic) in `mqtt-bridge/.env` and `mimic-device/.env`. Commit `.env.example` with placeholders only; confirm no `.env` is tracked (`git status`).
- Keep components small and single-purpose; `hooks/` isolates data-fetching/real-time logic.
- Tailwind tokens live in `index.css` under `@theme`, mirroring `DESIGN.md`; no inline hex values in JSX.
- Material Symbols icon names must be verified (`"thermostat"`, not `"thermometer"`; switcher uses `expand_more`, `check`, `add`).
- When a value has independently classified sub-zones (min vs max), a single shared indicator must reflect the **more severe** one.
- Dev tips: if the server fails with `EADDRINUSE` on port 5000, another `node` process (often a leftover agent-started server) holds the port — find it with `netstat -ano | findstr :5000` and stop it with `taskkill /PID <pid> /F`. In PowerShell, `$pull`-style Mongo operators inside `node -e "..."` are interpreted as variables; use single quotes or a script file.

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
- Socket JWT and device list are only checked at handshake (see Socket.IO section).
- A device added by mistake stays on that account (no unlink).

## Out of Scope (Deferred beyond Phase 6)

- Unlink / re-link device flow (including releasing a device so another account can claim it)
- Device nicknames / renaming
- Limit on devices per account
- Password reset / email verification
- Settings page
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
- **Phase 5 (COMPLETE)**: Six devices (G3036, G3037, G3038, G3040, G3041, G3042; G3039 skipped because a real collection exists); one-account-per-device enforced by a unique partial index; multi-device MQTT; Socket.IO delivery scoped to per-device rooms with JWT handshake auth; socket disconnects on logout. One device per user.
- **Phase 6 (COMPLETE)**: Multiple devices per user — `user.devices` array with multikey unique partial index, atomic add with two distinct 409s, `?deviceId=` + `resolveDevice` middleware, multi-room sockets with client-side filtering and reconnect after linking, `DeviceContext` + header `DeviceSwitcher` + "Add device" flow with Cancel, `LinkDevice` error-message fix. Unlink remains out of scope.