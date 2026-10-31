# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 7 — Role-Based Access Control (COMPLETE)

Phase 7 added **three roles** and two new panels on top of the Phase 6 multi-device dashboard. No Phase 8 scope has been defined yet; do not start new features until a new phase is written into this file.

| Role | Who | What they can do |
|---|---|---|
| `farmer` | Self-registers at `/register` | Dashboard / log / calendar for their **approved** devices; requests devices (needs manager approval) from a dialog on My Devices; has a profile page; sees their manager's name and phone (call link). |
| `manager` | Created by an admin | Responsible for **one district**. Sees every farmer in that district and their devices' data (read-only); approves or rejects device requests; has a profile page. |
| `admin` | Seeded by script | Adds and deletes managers; sees platform counts; has a profile page. Sees **no** sensor readings. |

### Phase 7 stages (all done)

- **7a** Docs · **7b** Backend foundation (roles, names, location, phone, migration, admin seed, profile endpoints) · **7c** Device requests + manager scoping · **7d** Admin backend · **7e** Frontend foundation · **7f** Manager and admin panels · **7g** "Request device" moved from a separate page into a floating dialog.

**Out of scope (deferred)**: see "Out of Scope".

### Roles — authoritative rules

- `User.role` is one of `'admin' | 'manager' | 'farmer'`. It is assigned **only on the server**:
  - `/api/auth/register` always creates a `farmer`. Any `role` in the request body is ignored.
  - Managers are created only by an admin (`POST /api/admin/managers`).
  - The first admin is created only by `server/src/seed/seedAdmin.js` (idempotent; reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` from `server/.env`). There is no UI or API to create an admin.
- `User.status` is `'active' | 'removed'`. `requireAuth` rejects non-active users with the same generic 401 ("Authentication required"). `login` rejects them with the generic "Invalid email or password". Socket handshake rejects them too.
- Authorization is enforced **on the backend**. The frontend only hides UI; it is never the security boundary.
- `requireRole(...roles)` middleware (after `requireAuth`) returns 403 `{ error: { message: 'Forbidden', status: 403 } }` for other roles.
- Nobody can delete or demote themselves. Admins cannot be deleted. Only `manager` accounts can be deleted through the API.

### Manager ↔ farmer relationship (district-based)

- A manager has one `district`. A **unique partial index** guarantees at most one **active** manager per district:

```js
userSchema.index(
  { district: 1 },
  { unique: true, partialFilterExpression: { role: 'manager', status: 'active' } }
);
```

- **A farmer's manager is whoever is the active manager of the farmer's district.** There is **no `managerId` stored on farmers.** Derive it with a query: `User.findOne({ role: 'manager', status: 'active', district: farmer.district })`.
- If a district has no active manager, farmers there still work normally, device requests wait in `pending`, and the farmer's profile shows "No manager assigned yet". When a manager is later added, they automatically see those farmers and requests.
- Deleting a manager is a **soft delete** (`status: 'removed'`). Their district becomes unmanaged. Farmers, requests and approved devices are untouched. Past `decidedBy` references remain valid.
- If a farmer edits their district, their manager changes automatically (no other action).
- Future phases may allow multiple managers per district and automatic selection. Do not build that now, and do not hardcode "exactly one manager" anywhere except the helper (`utils/managerScope.js`, `utils/publicUser.js`) and the index above.

### `User` model

```js
{
  firstName: String,         // empty only for migrated legacy farmers until they complete their profile
  lastName: String,
  email: String,             // unique, lowercase, trimmed
  passwordHash: String,
  role: 'admin' | 'manager' | 'farmer',   // default 'farmer'
  status: 'active' | 'removed',           // default 'active'
  division: String,          // farmers and managers
  district: String,          // farmers and managers (managers: required, unique among active managers)
  phone: String,             // required for managers, optional for farmers and admin
  devices: [{ deviceId, linkedAt }],      // APPROVED devices only (farmers); default []
  createdBy: ObjectId | null,             // admin who created a manager
  createdAt: Date
}
```

- **`username` is removed** everywhere. Login is email + password. Declare every index in the schema, never by hand.
- Keep the unique partial index on `devices.deviceId` (a device belongs to at most one account).
- `profileComplete` is **derived**: for a farmer, true when `firstName`, `lastName`, `division` and `district` are all non-empty. Managers and admins are always complete.
- `publicUser(user)` (`utils/publicUser.js`) returns: `{ id, firstName, lastName, email, role, status, division, district, phone, devices, profileComplete, manager }` where `manager` is `{ firstName, lastName, phone }` for a farmer whose district has an active manager, otherwise `null`. Never return `passwordHash`.

### Locations (division / district)

- `server/src/utils/locations.js` exports `LOCATIONS` (8 divisions → 64 districts) and `isValidLocation(division, district)`. The server validates that `district` belongs to `division` on register, profile update and manager creation.
- `GET /api/meta/locations` (no auth) returns the same structure. The client uses it through `useLocations` (cached at module level). Never duplicate the list in the client.

| Division | Districts |
|---|---|
| Barishal | Barguna, Barishal, Bhola, Jhalokati, Patuakhali, Pirojpur |
| Chattogram | Bandarban, Brahmanbaria, Chandpur, Chattogram, Cumilla, Cox's Bazar, Feni, Khagrachhari, Lakshmipur, Noakhali, Rangamati |
| Dhaka | Dhaka, Faridpur, Gazipur, Gopalganj, Kishoreganj, Madaripur, Manikganj, Munshiganj, Narayanganj, Narsingdi, Rajbari, Shariatpur, Tangail |
| Khulna | Bagerhat, Chuadanga, Jashore, Jhenaidah, Khulna, Kushtia, Magura, Meherpur, Narail, Satkhira |
| Mymensingh | Jamalpur, Mymensingh, Netrokona, Sherpur |
| Rajshahi | Bogura, Chapainawabganj, Joypurhat, Naogaon, Natore, Pabna, Rajshahi, Sirajganj |
| Rangpur | Dinajpur, Gaibandha, Kurigram, Lalmonirhat, Nilphamari, Panchagarh, Rangpur, Thakurgaon |
| Sylhet | Habiganj, Moulvibazar, Sunamganj, Sylhet |

### Validation rules (`utils/validators.js`)

- Names: trimmed, 1–50 characters. Email: trimmed, lowercased, basic format check. Password: at least 8 characters.
- Phone: spaces and dashes stripped, then must match `/^\+?[0-9]{10,15}$/`. Stored stripped. The client renders `tel:<phone>` links.
- All server errors keep the shape `{ error: { message, status } }`; the client reads `err.response?.data?.error?.message`.

### Device requests (farmer → manager approval)

Model `DeviceRequest` (collection `devicerequests`):

```js
{
  farmerId: ObjectId,         // ref User
  deviceId: String,
  status: 'pending' | 'approved' | 'rejected',
  requestedAt: Date,
  decidedBy: ObjectId | null, // manager who decided
  decidedAt: Date | null,
  note: String | null         // optional reason on reject, or system reason
}
```

- **Unique partial index** on `deviceId` where `status = 'pending'`: only one pending request per device across all farmers. Created by `seedDevices.js` (`DeviceRequest.syncIndexes()`).
- All request endpoints (create, mine, approve, reject, manager list) return requests through one shared serializer: `{ id, deviceId, status, requestedAt, decidedAt, note }` (manager list adds `farmer: { id, firstName, lastName }`). No `_id` / `__v`.
- `POST /api/device-requests` (farmer only), `{ deviceId, deviceCode }`, order of checks:
  1. Validate input, then validate `{ deviceId, deviceCode }` against the `devices` collection → 400 generic "Invalid device ID or code" (never says which field was wrong).
  2. Farmer already owns it → 409 "You have already added this device".
  3. Another account already owns it → 409 "This device is already linked to another account".
  4. Farmer already has a pending request for it → 409 "You already have a pending request for this device".
  5. Another farmer has a pending request for it (or duplicate-key `11000` on create) → 409 "This device already has a pending request from another account".
  6. Create `pending` request → 201 `{ request }`.
  The request is allowed even when the district has no manager.
- **Manager decisions** (manager only; the request's farmer must be an active farmer in the manager's district, otherwise 404 "Request not found" — same message for invalid ID, nonexistent, or out-of-district):
  - `POST /api/manager/device-requests/:id/approve` — request must be `pending` (else 409 "Request is no longer pending"). Atomic push: `User.updateOne({ _id: farmerId, 'devices.deviceId': { $ne: deviceId } }, { $push: { devices: { deviceId, linkedAt: new Date() } } })`. Success → request `approved` (update filtered on `status: 'pending'`), `decidedBy`, `decidedAt`. `matchedCount === 0` → mark `rejected` with note "Already added", 409. Duplicate-key `11000` → mark `rejected` with note "Already linked to another account", 409.
  - `POST /api/manager/device-requests/:id/reject` — optional `{ note }` (string, trimmed, max 200). Frees the device for new requests.
  - Never implement approval as find-then-save.
- A rejected request can be retried (creates a new request).
- A device is **only** added to `user.devices` on approval. Pending devices have no readings access and no socket room.
- `GET /api/device-requests/mine` (farmer). `GET /api/manager/device-requests?status=pending|approved|rejected` (default `pending`, invalid → 400).

### Which device does a request mean? (`resolveDevice`)

`server/src/middleware/resolveDevice.js` runs after `requireAuth` on every `/api/readings/*` route and sets `req.deviceId`:

- A non-string `deviceId` (arrays, objects, bracketed keys like `deviceId[$ne]=x`) → 403 "Device not found for this account".
- **farmer:** no devices → 403 "No device linked"; `?deviceId=` not owned → 403 "Device not found for this account"; missing → first device.
- **manager:** `?deviceId=` is **required** (missing → 400 "deviceId is required"). It must belong to an active farmer in the manager's district, otherwise 403 "Device not found for this account" (same message whether or not the device exists). Read-only.
- **admin / any other role:** 403 "Forbidden". Admins never read sensor data.
- Controllers use `getReadingModel(req.deviceId)`. Never accept a device ID except through `resolveDevice`.

### Manager endpoints (`requireAuth` + `requireRole('manager')`)

- `GET /api/manager/overview` → `{ farmerCount, deviceCount, pendingRequestCount }` (manager's district only).
- `GET /api/manager/farmers` → `{ id, firstName, lastName, email, phone, division, district, deviceCount }[]` (active, sorted by name).
- `GET /api/manager/farmers/:farmerId` → farmer profile fields + `devices`. 404 "Farmer not found" for invalid, nonexistent or out-of-district IDs (identical).
- Device request endpoints (above). Readings for a farmer's device use `/api/readings/*?deviceId=`.

### Admin endpoints (`requireAuth` + `requireRole('admin')`)

- `GET /api/admin/overview` → `{ managerCount, farmerCount, deviceCount, unmanagedDistrictCount }` — counts only (active users; devices of active farmers; districts with active farmers but no active manager).
- `GET /api/admin/managers` → active managers sorted by name: `{ id, firstName, lastName, email, phone, division, district, farmerCount, createdAt }[]` (single aggregation).
- `POST /api/admin/managers` → `{ firstName, lastName, email, phone, division, district, password }`. Phone required. Duplicate email → 409 "Email already in use". Active manager already in district → 409 "This district already has a manager" (pre-check plus `11000` handled via `keyPattern`). Forces `role: 'manager'`, `status: 'active'`, `createdBy`. bcrypt cost 10. Returns 201 `{ manager }` (list shape). Never returns or logs the password.
- `DELETE /api/admin/managers/:id` → atomic soft delete. Identical 404 "Manager not found" for invalid, nonexistent, already-removed, admin or farmer IDs. Returns `{ success: true }`.

### Profile endpoints (all roles, `requireAuth`)

- `GET /api/auth/me` → `publicUser`.
- `PATCH /api/profile` — editable fields by role: farmer `firstName, lastName, phone, division, district`; manager and admin `firstName, lastName, phone`. Email, role, district/division (managers) are never editable here. District validated against division.
- `POST /api/profile/password` → `{ currentPassword, newPassword }`. Wrong current password → 400 "Current password is incorrect". New password min 8. bcrypt cost 10.

### Collection-per-device architecture (unchanged)

`Reading.js` is a factory: `getReadingModel(deviceId)` → `mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId)`. Every function in `readingsController.js` resolves its collection via `getReadingModel(req.deviceId)`. `changeStream.js` opens one Change Stream per seeded device. **`server/` never writes to reading collections — only `mqtt-bridge/` does.**

### Devices (unchanged)

Six seeded devices (`devices` collection, upserted by `seedDevices.js`): G3036 `PROHORI-G3036-7X4K2`, G3037 `PROHORI-G3037-9M2QF`, G3038 `PROHORI-G3038-4TC8W`, G3040 `PROHORI-G3040-2XJ7R`, G3041 `PROHORI-G3041-V5K9D`, G3042 `PROHORI-G3042-H6N3B`. Seed before starting the server. **G3039 is deliberately NOT used** (a real historical collection exists; never write to it, never seed it, never add it to `DEVICE_IDS`). The shared cluster also holds unrelated collections (`G3029`, `G3035`, Django tables) — never touch them. Before adding any further device ID, confirm no collection with that name exists in `iotdb`.

### Multi-device MQTT (unchanged)

Topic `prohori/<deviceId>/reading`. `mimic-device/` publishes for all six devices (QoS 1, non-retained, independent random-walk state per device). `mqtt-bridge/` subscribes to `prohori/+/reading`, validates the device ID **from the topic** against the seeded `devices` collection (refreshed every 60s), drops unknown IDs, validates numeric payloads, forces `device_id` to match the topic, sets `created_at` (UTC), and is the **sole writer**. The abandoned topic `farm_controller/CATTLE_CTRL_001/event` must never be used. Never run `simulator/` and the MQTT pipeline at the same time.

### Socket.IO rooms

- `socketAuth.js` verifies the JWT, loads the user fresh, and rejects (generic "Authentication required") if the token is missing/invalid/expired, the user does not exist, `status !== 'active'`, or there are no readable devices. It sets `socket.data.userId`, `socket.data.role`, `socket.data.deviceIds`:
  - **farmer:** their approved `devices`.
  - **manager:** every device of every active farmer in the manager's district (loaded at handshake, via `getManagerDeviceIds`).
  - **admin:** rejected.
- `app.js` joins one room `device:<id>` per ID in `socket.data.deviceIds`. IDs come only from the server-loaded list. No client-triggered join.
- `changeStream.js` emits `new-reading` only to `io.to('device:' + deviceId)`. No global `io.emit` for reading data anywhere in `server/`.
- The client filters live events by `payload.device_id` (unchanged).
- **Handshake data is a snapshot.** A client must reconnect (`disconnectSocket()` then `connectSocket(token)`) when its device list changes:
  - farmer: `useFarmerSync` polls `/api/auth/me` every 30 s and on tab focus while a request is pending (started on mount if any request is pending, and right after a successful new request), and reconnects the socket when the approved device IDs change.
  - manager: the socket is opened only on the farmer device view (once on entry) and closed on leaving. Managers and admins never open a socket elsewhere. The REST fetch must work even if the socket fails (`connect_error` is tolerated).
- Known limitations (accepted): JWT, role and device list are verified only at handshake; a manager or admin with no device IDs cannot connect; an already-open socket of a removed manager stays connected until it disconnects.

### Frontend

- `AuthContext` exposes `{ user, token, loading, login, register, logout, setUser, refreshUser }`. `register(firstName, lastName, email, password, division, district)`. `refreshUser()` does not toggle `loading` and only handles 401 (logout). Logout disconnects the socket and clears the saved selected device.
- **Role home** (`utils/roleHome.js`): admin → `/admin`, manager → `/manager`, farmer → `/complete-profile` / `/devices` / `/` by state.
- `DeviceContext` is used by farmer pages. Manager farmer-views pass the farmer's `deviceId` explicitly (read-only) through `useLatestReading(deviceId)` / `useDeviceStatus(deviceId)` and the other data hooks. Never hardcode a device ID in the client (the only allowed literal is the "e.g. G3036" placeholder in `RequestDeviceModal.jsx`).
- Shared view components `components/views/` (`DashboardView`, `HistoryView`, `CalendarView`) take a `deviceId` and are used by both the farmer pages and the manager device view.
- **Request device** is a floating dialog (`components/devices/RequestDeviceModal.jsx`), opened from My Devices (header button and empty state) and from the DeviceSwitcher's "Request device" row (navigates to `/devices` with router state `{ openRequest: true }`, cleared after opening). There is no `/link-device` page; `/link-device` redirects to `/devices`.
- Header: the `account_circle` icon links to `/profile` for every role. The notifications icon stays inert. `showDevice={false}` hides the device label/switcher/status/last-updated for manager and admin pages.
- Sidebar items by role:
  - farmer: Dashboard, History, Calendar, My Devices, Profile (Settings stays disabled).
  - manager: Overview, Farmers, Requests, Profile.
  - admin: Overview, Managers, Profile.
- Components stay small and single-purpose; data fetching lives in `hooks/`. New API wrappers go in `services/api.js` with the Bearer interceptor.
- Call links use `<a href={"tel:" + phone}>` with the Material Symbols `call` icon.

## Stack

**Backend:** Node.js + Express, Mongoose, Socket.IO (JWT-authenticated per-device rooms), MongoDB Change Streams, `bcrypt` (cost 10), `jsonwebtoken` (7-day expiry, no refresh tokens), dotenv, cors.

**Device pipeline:** `mimic-device/` (Python, fake readings over MQTT), `mqtt-bridge/` (Python, sole writer to reading collections), `simulator/` (retired).

**Database:** MongoDB Atlas, database `iotdb`. Reading collections keyed per device. `devices` (seeded), `users`, `devicerequests`. `server/` is read-only for reading data.

**Frontend:** React (Vite), react-router-dom, Tailwind CSS (tokens in `client/src/index.css` under `@theme`, mirroring `DESIGN.md`), Recharts, Socket.IO client, axios.

**Design source:** Stitch exports for the authentication pages (Login, Register, Complete Profile) via `AuthShell.jsx`. Authenticated pages follow `DESIGN.md` tokens directly. New pages must reuse existing tokens/components — no new colors.

## Data Source — DO NOT GUESS FIELD NAMES

Database `iotdb`, collection keyed per device (`G3036`, `G3037`, `G3038`, `G3040`, `G3041`, `G3042`). Reading document shape (confirmed, do not alter):

```js
{
  _id: ObjectId,
  device_id: String,
  ammonia: Number,      // ppm
  methane: Number,      // ppm
  humidity: Number,     // %
  temperature: Number,  // °F
  timestamp: Number,    // Unix epoch seconds, set by device
  created_at: Date      // set by mqtt-bridge — use for sorting/filtering
}
```

Rules:
- Never invent fields that aren't in this schema.
- Use `created_at` (not `timestamp`) for all queries, sorting and grouping.
- Look reading collections up via `getReadingModel(deviceId)`; never hardcode a device ID in controller, hook or component code. (Exceptions: `seedDevices.js`, `.env`/`.env.example` for `mimic-device/`, the "e.g. G3036" placeholder in `RequestDeviceModal.jsx`.)
- `users`, `devices` and `devicerequests` are plain Mongoose models.
- Connection strings and secrets live in `.env` files — never hardcode, never commit `.env`. Admin seed credentials live only in `server/.env`.
- Never write to, seed, or add to `DEVICE_IDS` any ID whose collection already exists for other reasons (notably `G3039`).

## Folder Structure

```
prohori-dashboard/
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/            # Reading (factory), User, Device, DeviceRequest
│   │   ├── controllers/       # auth, profile, deviceRequest, manager, admin, readings
│   │   ├── utils/             # thresholds, locations, validators, publicUser, managerScope
│   │   ├── routes/            # auth, profile, meta, deviceRequests, manager, admin, readings
│   │   ├── middleware/        # errorHandler, requireAuth, requireRole, resolveDevice
│   │   ├── seed/              # seedDevices (+syncIndexes), migrateDevices (Phase 6, done),
│   │   │                      #   migrateRoles (done), seedAdmin
│   │   ├── sockets/           # changeStream, socketAuth
│   │   └── app.js
│   ├── .env / .env.example    # MONGO_URI, PORT, CLIENT_ORIGIN, JWT_SECRET, ADMIN_*
│   └── package.json
├── mimic-device/   ...unchanged
├── mqtt-bridge/    ...unchanged
├── simulator/      # RETIRED
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/    # Sidebar (role-aware), Header, DeviceSwitcher
│   │   │   ├── auth/      # AuthShell
│   │   │   ├── devices/   # RequestDeviceModal
│   │   │   ├── dashboard/ # SensorCard, ReadingsPanel, HistoryTable, HistoryTabs, TrendChart
│   │   │   ├── calendar/  # CalendarGrid, DayDetailCards
│   │   │   ├── views/     # DashboardView, HistoryView, CalendarView (take deviceId)
│   │   │   ├── profile/   # ProfileForm, PasswordForm, ManagerCard, DistrictCard
│   │   │   ├── location/  # LocationSelect
│   │   │   └── common/    # StatusBadge, RequestStatusBadge, MetricCard, ConfirmDialog
│   │   ├── context/       # AuthContext, DeviceContext
│   │   ├── pages/         # Login, Register, CompleteProfile, Dashboard, History, Calendar,
│   │   │                  #   Devices, Profile, manager/*, admin/*
│   │   ├── hooks/         # reading hooks, useLocations, useFarmerSync, manager/admin data hooks
│   │   ├── services/      # api.js, socket.js
│   │   ├── utils/         # dateFormatter, roleHome
│   │   ├── App.jsx        # role-aware route guards
│   │   ├── main.jsx       # AuthProvider > DeviceProvider > App
│   │   └── index.css
│   └── package.json
├── AGENTS.md  PAGES.md  DESIGN.md  README.md
```

## Migration (done; must remain idempotent)

`server/src/seed/migrateRoles.js`: users without a `role` get `role: 'farmer'`, `status: 'active'`; the legacy non-sparse `username_1` index is dropped first, then `username` is `$unset`; names/division/district stay empty (forcing `/complete-profile`). Order: `migrateRoles.js` → `seedDevices.js` (syncIndexes) → `seedAdmin.js`. Re-running changes nothing.

## Route Guard Summary (single source for `App.jsx`)

| State | Farmer pages `/`, `/history`, `/calendar` | `/devices`, `/profile` | `/complete-profile` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` |
| Farmer, profile complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, profile complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile` shown; others → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile` shown; others → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

`/link-device` redirects to `/devices`. While the initial `/api/auth/me` is in flight (`loading: true`), a minimal loading state renders instead of any redirect.

## API Contract

- `POST /api/auth/register` → `{ firstName, lastName, email, password, division, district }` → `{ token, user }` (always a farmer; 409 "Email already in use")
- `POST /api/auth/login` → `{ email, password }` → `{ token, user }`; generic "Invalid email or password"
- `GET /api/auth/me` → `publicUser`
- `GET /api/meta/locations` → `{ [division]: string[] }` (no auth)
- `PATCH /api/profile`, `POST /api/profile/password`
- `POST /api/device-requests`, `GET /api/device-requests/mine` (farmer)
- `GET /api/manager/overview | farmers | farmers/:farmerId | device-requests`, `POST /api/manager/device-requests/:id/approve|reject` (manager)
- `GET /api/admin/overview`, `GET|POST /api/admin/managers`, `DELETE /api/admin/managers/:id` (admin)
- `GET /api/readings/latest | daily-averages | log | calendar | day/:date | history` — `?deviceId=` rules per role via `resolveDevice`
- `GET /health` — no auth
- **Removed:** `POST /api/auth/link-device` (replaced by `POST /api/device-requests`; now 404).
- **Socket.IO:** JWT in `auth.token`; rooms per role; `new-reading` payload matches `/api/readings/latest` (includes `device_id`).

## Conventions

- Backend: controller/route separation, async/await with try/catch, centralized error middleware, no business logic in route files. Authorization checks are server-side.
- Frontend: functional components + hooks only. Tailwind utility classes only, tokens from `index.css`; no inline hex values in JSX.
- Passwords: bcrypt cost 10; never log or return `passwordHash` or plaintext passwords.
- JWT: 7-day expiry; frontend stores it in `localStorage` (`prohori_token`); selected device in `prohori_selected_device`.
- Never hardcode a device ID; never read `user.device` (removed Phase 6) or `user.username` (removed Phase 7).
- Never trust a role, district or device ID from the request body/params without the server-side check.
- Uniqueness and integrity rules live in database indexes and atomic updates, not just controllers.
- Never use `io.emit` for reading data; always target a `device:<deviceId>` room.
- Same 404/403 message whether a resource does not exist or is out of scope (no information leak).
- Test fixtures: use an isolated email prefix (e.g. `e2e-`) and clean up only those users and their requests. Never `deleteMany({})` on a real collection.
- Mongoose: use `returnDocument: 'after'` (not `new: true`).
- Client reads server errors from `err.response?.data?.error?.message`.
- Material Symbols icon names must be verified.
- Dev tips: `EADDRINUSE` on port 5000 → `netstat -ano | findstr :5000`, `taskkill /PID <pid> /F`. In Git Bash and PowerShell, `$` Mongo operators inside `node -e "..."` are expanded; use single quotes or a script file.

## Threshold / Alert Logic (ACTIVE — one global table for all roles)

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

- Humidity and temperature are two-sided. Methane has a gap between 5,000 and 50,000 — implemented exactly as given.
- Zones are computed **server-side** (`thresholds.js`); the frontend renders a `zone` field. Daily averages classify the averaged value; calendar min/max classify independently.
- Visual indication only — no push/email/SMS/sound alerts. Managers see the same zones as farmers.
- If the company revises thresholds, update this table first.

## Known Temporary Workarounds / Limitations (Still Open)

- `getHistory`/`getDailyAverages` use document-count `.limit()` windowing instead of a `Date.now()`-relative `$gte` filter. Search `TODO(revert-for-production)` in `readingsController.js`.
- `getDailyAverages` / calendar grouping uses UTC; may need `timezone: "Asia/Dhaka"`.
- Socket JWT, role and device list are only checked at handshake.
- A device approved by mistake stays on that account (no unlink).
- A manager's initial password is set by the admin; no forced-change or reset-by-email flow.
- A removed manager's email stays taken (email index covers all users); admin cannot edit or restore a removed manager.
- Managers/admins with no device IDs cannot open a socket; an open socket of a removed manager persists until disconnect.
- Mongoose may print a deprecation warning on some update options; harmless.

## Cleanup Candidates (not yet removed)

- `client/src/hooks/useReadingsHistory.js` and `GET /api/readings/history` (unused).
- `client/stitch-export.html` (static design reference, not served).
- Unused Vite template assets: `client/src/App.css`, `client/src/assets/react.svg`, `client/src/assets/vite.svg`, `client/public/icons.svg` and the template favicon file, if confirmed unused.
- README leftover lines (`// palash, i am here` etc.) and the retired `simulator/` references.

## Out of Scope (Deferred beyond Phase 7)

- Messaging between farmer and manager
- Multiple managers per district and automatic manager selection
- Farms / cow rooms hierarchy
- Audit-log module and activity history pages
- Per-manager (local) thresholds, persisted alerts, acknowledge/escalate workflows
- MQTT topic administration / health pages; managers registering new devices
- Unlink / re-link device flow, device nicknames, device limit per account
- Password reset / email verification / email invites
- Push/email/SMS notifications
- Export/download data
- Settings page
- Login timing-side-channel hardening; periodic socket JWT re-validation

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Socket.IO + Change Streams, simulator, daily-average charting, reading log, calendar.
- **Phase 3 (COMPLETE)**: MQTT pipeline (`mimic-device/` + `mqtt-bridge/`).
- **Phase 4 (COMPLETE)**: JWT/bcrypt auth, device linking, `Reading` factory, seeded `devices`, route guards.
- **Phase 5 (COMPLETE)**: Six devices, one account per device (unique partial index), per-device socket rooms.
- **Phase 6 (COMPLETE)**: Multiple devices per user, `?deviceId=` + `resolveDevice`, `DeviceSwitcher`, add-device flow.
- **Phase 7 (COMPLETE)**: RBAC — roles (admin / manager / farmer), district-based single manager, farmer registration with name + division/district, device-request approval (dialog-based request flow), manager panel, admin panel (manager add/delete), profile pages for all roles, phone + call link.