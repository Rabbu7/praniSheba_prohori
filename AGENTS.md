# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 7 — Role-Based Access Control (IN PROGRESS)

Phase 6 (multiple devices per user) is complete. Phase 7 adds **three roles** and two new panels:

| Role | Who | What they can do |
|---|---|---|
| `farmer` | Self-registers at `/register` | Existing dashboard / log / calendar for their **approved** devices; requests devices (needs manager approval); has a profile page; sees their manager's name and phone. |
| `manager` | Created by an admin | Responsible for **one district**. Sees every farmer in that district and their devices' data (read-only); approves or rejects device requests; has a profile page. |
| `admin` | Seeded by script | Adds and deletes managers; sees platform counts; has a profile page. Sees **no** sensor readings. |

### Phase 7 stages

1. **7a — Docs** (`AGENTS.md` + `PAGES.md`).
2. **7b — Backend foundation:** `User` changes (roles, names, location, phone), `locations.js`, `migrateRoles.js`, `seedAdmin.js`, `requireRole`, `status` check in `requireAuth`, register/login/me changes, profile endpoints.
3. **7c — Device requests + manager scoping:** `DeviceRequest` model, farmer request / manager approve-reject, extended `resolveDevice`, manager socket rooms.
4. **7d — Admin backend:** manager create / list / soft-delete, platform overview.
5. **7e — Frontend foundation:** register page, complete-profile step, profile pages, role-aware guards and navigation, farmer request flow.
6. **7f — Manager and Admin panels + verification pass.**

**Out of scope for Phase 7** (see "Out of Scope"): messaging, multiple managers per district, automatic manager selection, farms / cow rooms, audit-log module, per-manager thresholds, persisted alerts, MQTT administration, unlink device, email invites / password reset.

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
- Future phases may allow multiple managers per district and automatic selection. Do not build that now, and do not hardcode "exactly one manager" anywhere except the helper and the index above.

### `User` model (Phase 7)

```js
{
  firstName: String,         // required for all roles (empty only for migrated legacy users until they complete their profile)
  lastName: String,
  email: String,             // unique, lowercase, trimmed
  passwordHash: String,
  role: 'admin' | 'manager' | 'farmer',   // default 'farmer'
  status: 'active' | 'removed',           // default 'active'
  division: String,          // farmers and managers
  district: String,          // farmers and managers (managers: required, unique among active managers)
  phone: String,             // required for managers, optional for farmers, optional for admin
  devices: [{ deviceId, linkedAt }],      // APPROVED devices only (farmers); default []
  createdBy: ObjectId | null,             // admin who created a manager
  createdAt: Date
}
```

- **`username` is removed** everywhere (model, controllers, client). It is replaced by `firstName` + `lastName`. Login stays email + password. `seedDevices.js` calls `User.syncIndexes()`, which drops the old `username` unique index — declare every index in the schema, never by hand.
- Keep the existing unique partial index on `devices.deviceId` (a device belongs to at most one account).
- `profileComplete` is **derived** (not stored): for a farmer, true when `firstName`, `lastName`, `division` and `district` are all non-empty. It is returned by `/api/auth/me`. Managers and admins are always complete.
- `publicUser(user)` returns: `{ id, firstName, lastName, email, role, status, division, district, phone, devices, profileComplete, manager }` where `manager` is `{ firstName, lastName, phone }` for a farmer whose district has an active manager, otherwise `null`. Never return `passwordHash`.

### Locations (division / district)

- `server/src/utils/locations.js` exports `LOCATIONS`: Bangladesh's 8 divisions → their 64 districts (list below). The server validates that `district` belongs to `division` on register, profile update and manager creation.
- `GET /api/meta/locations` (no auth) returns the same structure so the client dropdowns use it. Never duplicate the list in the client.

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

### Validation rules

- Names: trimmed, 1–50 characters. Email: trimmed, lowercased, basic format check. Password: at least 8 characters.
- Phone: spaces and dashes stripped, then must match `/^\+?[0-9]{10,15}$/`. Stored stripped. The client renders `tel:<phone>` links.
- All server errors keep the shape `{ error: { message, status } }`; the client reads `err.response?.data?.error?.message`.

### Device requests (farmer → manager approval)

New model `DeviceRequest` (collection `devicerequests`):

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

- **Unique partial index** on `deviceId` where `status = 'pending'`: only one pending request per device across all farmers. Declare in the schema.
- Linking a device is now a **request**. `POST /api/device-requests` (farmer only), `{ deviceId, deviceCode }`, order of checks:
  1. Validate input, then validate `{ deviceId, deviceCode }` against the `devices` collection → 400 generic "Invalid device ID or code" (never says which field was wrong).
  2. Farmer already owns it → 409 "You have already added this device".
  3. Another account already owns it → 409 "This device is already linked to another account".
  4. Farmer already has a pending request for it → 409 "You already have a pending request for this device".
  5. Another farmer has a pending request for it (or a duplicate-key error `11000` on create) → 409 "This device already has a pending request from another account".
  6. Create `pending` request → 201 `{ request }`.
  All 409 messages are reachable only after a correct code, so they do not leak which device IDs exist. The farmer's request is allowed even when the district has no manager.
- **Manager decisions** (manager only; the request's farmer must be in the manager's district, otherwise 404):
  - `POST /api/manager/device-requests/:id/approve` — request must be `pending`. Run the existing atomic push: `User.updateOne({ _id: farmerId, 'devices.deviceId': { $ne: deviceId } }, { $push: { devices: { deviceId, linkedAt: new Date() } } })`. Success → set request `approved`, `decidedBy`, `decidedAt`. `matchedCount === 0` (already owned) → mark request `rejected` with note "Already added", return 409. Duplicate-key `11000` (another account owns it) → mark `rejected` with note "Already linked to another account", return 409.
  - `POST /api/manager/device-requests/:id/reject` — optional `{ note }` (max 200 chars). Frees the device for new requests.
  - Do not implement approval as find-then-save. Uniqueness stays enforced by the database.
- A rejected request can be retried (creates a new request).
- A device is **only** added to `user.devices` on approval. Pending devices have no readings access and no socket room.
- Farmer can list their own requests: `GET /api/device-requests/mine`.
- Managers list requests for their district: `GET /api/manager/device-requests?status=pending|approved|rejected` (default `pending`), each including the farmer's name.
- A manager with no district match sees nothing; an unmanaged district's requests stay pending.

### Which device does a request mean? (extended `resolveDevice`)

`server/src/middleware/resolveDevice.js` runs after `requireAuth` on every `/api/readings/*` route and sets `req.deviceId`:

- **farmer:** unchanged from Phase 6 (no devices → 403 "No device linked"; `?deviceId=` not owned → 403 "Device not found for this account"; missing → first device).
- **manager:** `?deviceId=` is **required** (missing → 400 "deviceId is required"). It must belong to an `active` farmer whose `district` equals the manager's district; otherwise 403 "Device not found for this account" (same message whether or not the device exists). Managers have read access only — no endpoint writes readings anyway.
- **admin:** 403 "Forbidden". Admins never read sensor data.
- Controllers still use `getReadingModel(req.deviceId)`. Never accept a device ID from anywhere except through `resolveDevice`. Never hardcode device IDs.

### Manager endpoints (all `requireAuth` + `requireRole('manager')`)

- `GET /api/manager/overview` → `{ farmerCount, deviceCount, pendingRequestCount }` (counts only the manager's district).
- `GET /api/manager/farmers` → farmers in the manager's district: `{ id, firstName, lastName, email, phone, division, district, deviceCount }[]` (only `active`, sorted by name).
- `GET /api/manager/farmers/:farmerId` → that farmer's profile fields + `devices`. 404 if the farmer is not an active farmer in the manager's district (same 404 for nonexistent and out-of-district IDs — no leak).
- Device requests endpoints (above).
- Readings for a farmer's device use the existing `/api/readings/*?deviceId=` endpoints through `resolveDevice`.

### Admin endpoints (all `requireAuth` + `requireRole('admin')`)

- `GET /api/admin/overview` → `{ managerCount, farmerCount, deviceCount, unmanagedDistrictCount }` — counts only, no readings. `unmanagedDistrictCount` = distinct districts that have active farmers but no active manager.
- `GET /api/admin/managers` → active managers: `{ id, firstName, lastName, email, phone, division, district, farmerCount, createdAt }[]`.
- `POST /api/admin/managers` → `{ firstName, lastName, email, phone, division, district, password }`. Validates (including district-in-division and phone). Duplicate email → 409 "Email already in use". Active manager already exists for that district (index violation `11000` on the district index, or pre-check) → 409 "This district already has a manager". Creates `role: 'manager'`, `createdBy: <admin id>`. The admin sets the initial password; the manager can change it from their profile. Never return or log the password.
- `DELETE /api/admin/managers/:id` → soft delete (`status: 'removed'`). 404 if not an active manager. Self-deletion and admin deletion are impossible by construction (only `role: 'manager'` matches).

### Profile endpoints (all roles, `requireAuth`)

- `GET /api/auth/me` → `publicUser`.
- `PATCH /api/profile` → editable fields by role:
  - farmer: `firstName`, `lastName`, `phone`, `division`, `district` (district validated against division).
  - manager: `firstName`, `lastName`, `phone`. District and division are **not** editable by the manager (the admin owns that).
  - admin: `firstName`, `lastName`, `phone`.
  - Email and role are never editable here.
- `POST /api/profile/password` → `{ currentPassword, newPassword }`. Wrong current password → 400 "Current password is incorrect". New password min 8 chars. bcrypt cost 10.

### Collection-per-device architecture (unchanged)

`Reading.js` is a factory: `getReadingModel(deviceId)` → `mongoose.models[deviceId] || mongoose.model(deviceId, readingSchema, deviceId)`. Every function in `readingsController.js` resolves its collection via `getReadingModel(req.deviceId)`. `changeStream.js` opens one Change Stream per seeded device. **`server/` never writes to reading collections — only `mqtt-bridge/` does.** Phase 7 does not touch `mimic-device/` or `mqtt-bridge/`.

### Devices (unchanged)

Six seeded devices (`devices` collection, upserted by `seedDevices.js`): G3036 `PROHORI-G3036-7X4K2`, G3037 `PROHORI-G3037-9M2QF`, G3038 `PROHORI-G3038-4TC8W`, G3040 `PROHORI-G3040-2XJ7R`, G3041 `PROHORI-G3041-V5K9D`, G3042 `PROHORI-G3042-H6N3B`. Seed before starting the server. **G3039 is deliberately NOT used** (a real historical collection exists; never write to it, never seed it, never add it to `DEVICE_IDS`). The shared cluster also holds unrelated collections (`G3029`, `G3035`, Django tables) — never touch them. Before adding any further device ID, confirm no collection with that name exists in `iotdb`.

### Multi-device MQTT (unchanged)

Topic `prohori/<deviceId>/reading`. `mimic-device/` publishes for all six devices (QoS 1, non-retained, independent random-walk state per device). `mqtt-bridge/` subscribes to `prohori/+/reading`, validates the device ID **from the topic** against the seeded `devices` collection (refreshed every 60s), drops unknown IDs, validates numeric payloads, forces `device_id` to match the topic, sets `created_at` (UTC), and is the **sole writer**. The abandoned topic `farm_controller/CATTLE_CTRL_001/event` must never be used. Never run `simulator/` and the MQTT pipeline at the same time.

### Socket.IO rooms (extended for managers)

- `socketAuth.js` verifies the JWT, loads the user fresh, and rejects (generic "Authentication required") if the token is missing/invalid/expired, the user does not exist, `status !== 'active'`, or the user has no readable devices. It sets `socket.data.userId`, `socket.data.role` and `socket.data.deviceIds`:
  - **farmer:** `deviceIds` = their approved `devices`.
  - **manager:** `deviceIds` = every device of every active farmer in the manager's district (loaded server-side at handshake).
  - **admin:** rejected (no reading access).
- `app.js` joins one room `device:<id>` per ID in `socket.data.deviceIds`. IDs come **only** from the server-loaded list, never from the client. No client-triggered join event.
- `changeStream.js` emits `new-reading` only to `io.to('device:' + deviceId)`. There must be no global `io.emit` for reading data anywhere in `server/`.
- The client filters live events by `payload.device_id === selectedDeviceId` (unchanged).
- **Handshake data is a snapshot.** A client must reconnect (`disconnectSocket()` then `connectSocket(token)`) when its device list changes:
  - farmer: when `/api/auth/me` shows a new approved device. While a farmer has pending requests, the client refetches `/me` every 30 seconds and when the tab regains focus, and reconnects the socket if `devices` changed.
  - manager: when the manager opens a farmer view, the socket is reconnected once on entering the manager area (so new farmers/devices are included) and after each approval.
- Known limitation (accepted): the JWT and device list are only verified at handshake time.

### Frontend (Phase 7)

- `AuthContext` exposes `{ user, token, loading, login, register, logout, setUser, refreshUser }`. `register(firstName, lastName, email, password, division, district)`. Logout still disconnects the socket and clears the saved selected device.
- **Role home:** admin → `/admin`, manager → `/manager`, farmer → `/`.
- `DeviceContext` is used by farmer pages (selected device from `user.devices`). Manager farmer-views pass the chosen farmer's `deviceId` to the same data hooks/components in **read-only** mode (no "Add device", no switcher outside that farmer's devices). Never hardcode a device ID in the client.
- Header: the existing `account_circle` icon becomes a link to `/profile` for every role. The notifications icon stays inert.
- Sidebar items by role (same visual style, `DESIGN.md` tokens):
  - farmer: Dashboard, History, Calendar, My Devices, Profile (Settings stays disabled).
  - manager: Overview, Farmers, Requests, Profile.
  - admin: Overview, Managers, Profile.
- Components stay small and single-purpose; data fetching lives in `hooks/`. New API wrappers go in `services/api.js` with the existing Bearer interceptor.
- Call links use `<a href={"tel:" + phone}>` with the Material Symbols `call` icon.

## Stack

**Backend:** Node.js + Express, Mongoose, Socket.IO (JWT-authenticated per-device rooms), MongoDB Change Streams, `bcrypt` (cost 10), `jsonwebtoken` (7-day expiry, no refresh tokens), dotenv, cors.

**Device pipeline:** `mimic-device/` (Python, fake readings over MQTT), `mqtt-bridge/` (Python, sole writer to reading collections), `simulator/` (retired).

**Database:** MongoDB Atlas, database `iotdb`. Reading collections keyed per device. `devices` (seeded), `users`, `devicerequests`. `server/` is read-only for reading data.

**Frontend:** React (Vite), react-router-dom, Tailwind CSS (tokens in `client/src/index.css` under `@theme`, mirroring `DESIGN.md`), Recharts, Socket.IO client, axios.

**Design source:** Stitch exports for the authentication pages (Login, Register, Complete Profile) via `AuthShell.jsx`. Authenticated pages follow `DESIGN.md` tokens directly. New Phase 7 pages must reuse existing tokens/components — no new colors.

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
- Look reading collections up via `getReadingModel(deviceId)`; never hardcode a device ID in controller, hook or component code. (Exceptions: `seedDevices.js`, `.env`/`.env.example` for `mimic-device/`, placeholder text such as "e.g. G3036" in `RequestDeviceModal.jsx`.)
- `users`, `devices` and `devicerequests` are plain Mongoose models.
- Connection strings and secrets live in `.env` files — never hardcode, never commit `.env`. `JWT_SECRET` is a locally generated random secret. Admin seed credentials live only in `server/.env`.
- Never write to, seed, or add to `DEVICE_IDS` any ID whose collection already exists for other reasons (notably `G3039`).

## Folder Structure

```
prohori-dashboard/
├── server/
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/
│   │   │   ├── Reading.js            # factory getReadingModel(deviceId)
│   │   │   ├── User.js               # firstName, lastName, email, passwordHash, role, status, division,
│   │   │   │                         #   district, phone, devices[], createdBy; unique partial indexes on
│   │   │   │                         #   devices.deviceId and (district where active manager)
│   │   │   ├── Device.js             # seeded devices (deviceId, deviceCode)
│   │   │   └── DeviceRequest.js      # NEW — pending/approved/rejected; unique partial index on pending deviceId
│   │   ├── controllers/
│   │   │   ├── authController.js     # register (farmer only), login, me
│   │   │   ├── profileController.js  # NEW — updateProfile, changePassword
│   │   │   ├── deviceRequestController.js  # NEW — farmer create/list-mine; manager list/approve/reject
│   │   │   ├── managerController.js  # NEW — overview, farmers list/detail
│   │   │   ├── adminController.js    # NEW — overview, managers list/create/delete
│   │   │   └── readingsController.js # unchanged logic, uses req.deviceId
│   │   ├── utils/
│   │   │   ├── thresholds.js         # zone classification — single source of truth
│   │   │   ├── locations.js          # NEW — divisions → districts, validators
│   │   │   └── publicUser.js         # NEW — shared publicUser(user) + manager lookup
│   │   ├── routes/
│   │   │   ├── auth.js               # /register, /login, /me
│   │   │   ├── profile.js            # NEW — PATCH /api/profile, POST /api/profile/password
│   │   │   ├── meta.js               # NEW — GET /api/meta/locations
│   │   │   ├── deviceRequests.js     # NEW — farmer endpoints
│   │   │   ├── manager.js            # NEW — requireRole('manager')
│   │   │   ├── admin.js              # NEW — requireRole('admin')
│   │   │   └── readings.js           # requireAuth + resolveDevice
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   ├── requireAuth.js        # also rejects status !== 'active'
│   │   │   ├── requireRole.js        # NEW
│   │   │   └── resolveDevice.js      # role-aware (see above)
│   │   ├── seed/
│   │   │   ├── seedDevices.js        # upsert 6 devices + syncIndexes()
│   │   │   ├── migrateDevices.js     # Phase 6 (already run)
│   │   │   ├── migrateRoles.js       # NEW — one-time, idempotent (see Migration)
│   │   │   └── seedAdmin.js          # NEW — idempotent first admin
│   │   ├── sockets/
│   │   │   ├── changeStream.js       # unchanged
│   │   │   └── socketAuth.js         # role-aware deviceIds; rejects admin/removed
│   │   └── app.js                    # mounts all routers; joins one room per socket.data.deviceIds
│   ├── .env / .env.example           # + ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME
│   └── package.json
├── mimic-device/   ...unchanged
├── mqtt-bridge/    ...unchanged
├── simulator/      # RETIRED
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/    # Sidebar (role-aware), Header (profile link), DeviceSwitcher
│   │   │   ├── auth/      # AuthShell
│   │   │   ├── devices/   # RequestDeviceModal
│   │   │   ├── dashboard/ # SensorCard, ReadingsPanel, HistoryTable, HistoryTabs, TrendChart
│   │   │   ├── calendar/  # CalendarGrid, DayDetailCards
│   │   │   ├── profile/   # NEW — ProfileForm, PasswordForm, ManagerCard (name + call link)
│   │   │   ├── location/  # NEW — LocationSelect (division → district)
│   │   │   └── common/    # StatusBadge
│   │   ├── context/       # AuthContext, DeviceContext
│   │   ├── pages/
│   │   │   ├── Login.jsx, Register.jsx,
│   │   │   ├── Dashboard.jsx, History.jsx, Calendar.jsx          # farmer
│   │   │   ├── Devices.jsx            # NEW — farmer "My Devices" (request statuses)
│   │   │   ├── CompleteProfile.jsx    # NEW — one-time step for migrated farmers
│   │   │   ├── Profile.jsx            # NEW — all roles
│   │   │   ├── manager/               # NEW — Overview, Farmers, FarmerDetail, FarmerDevice, Requests
│   │   │   └── admin/                 # NEW — Overview, Managers
│   │   ├── hooks/         # existing data hooks + useDeviceRequests, useManagerFarmers, useAdminManagers, ...
│   │   ├── services/      # api.js, socket.js
│   │   ├── App.jsx        # role-aware route guards
│   │   ├── main.jsx       # AuthProvider > DeviceProvider > App
│   │   └── index.css
│   └── package.json
├── AGENTS.md  PAGES.md  DESIGN.md  README.md
```

## Migration (7b, run once; must be idempotent)

`server/src/seed/migrateRoles.js`:
- Every existing user without a `role` gets `role: 'farmer'`, `status: 'active'`. Existing `devices` stay as-is (treated as approved).
- `username` is `$unset`; `firstName`/`lastName`/`division`/`district` stay empty. These users are sent to `/complete-profile` on next login (`profileComplete` false) — they cannot reach data pages until done.
- Then run `node src/seed/seedDevices.js` (calls `syncIndexes()`) so the old `username` index is dropped and the new indexes are created. If index creation fails due to existing duplicates, clear them manually first.
- Then run `node src/seed/seedAdmin.js` to create the first admin.
- Re-running changes nothing.

## Route Guard Summary (single source for `App.jsx`)

| State | Farmer pages `/`, `/history`, `/calendar` | `/devices`, `/profile` | `/complete-profile` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` |
| Farmer, profile complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, profile complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile` shown; others → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile` shown; others → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

While the initial `/api/auth/me` is in flight (`loading: true`), a minimal loading state renders instead of any redirect.

## API Contract

- `POST /api/auth/register` → `{ firstName, lastName, email, password, division, district }` → `{ token, user }` (always a farmer; 409 "Email already in use")
- `POST /api/auth/login` → `{ email, password }` → `{ token, user }`; generic "Invalid email or password"
- `GET /api/auth/me` → `publicUser`
- `GET /api/meta/locations` → `{ [division]: string[] }` (no auth)
- `PATCH /api/profile`, `POST /api/profile/password` (see Profile endpoints)
- `POST /api/device-requests`, `GET /api/device-requests/mine` (farmer)
- `GET /api/manager/overview`, `GET /api/manager/farmers`, `GET /api/manager/farmers/:farmerId`, `GET /api/manager/device-requests`, `POST /api/manager/device-requests/:id/approve|reject` (manager)
- `GET /api/admin/overview`, `GET|POST /api/admin/managers`, `DELETE /api/admin/managers/:id` (admin)
- `GET /api/readings/latest | daily-averages | log | calendar | day/:date | history` — `?deviceId=` rules per role via `resolveDevice`
- `GET /health` — no auth
- **Removed:** `POST /api/auth/link-device` (replaced by `POST /api/device-requests`).
- **Socket.IO:** JWT in `auth.token`; rooms per role (see above); `new-reading` payload shape matches `/api/readings/latest` (includes `device_id`).

## Conventions

- Backend: controller/route separation, async/await with try/catch, centralized error middleware, no business logic in route files. Authorization checks are server-side.
- Frontend: functional components + hooks only. Tailwind utility classes only, tokens from `index.css`; no inline hex values in JSX.
- Passwords: bcrypt cost 10; never log or return `passwordHash` or plaintext passwords.
- JWT: 7-day expiry, `JWT_SECRET`; frontend stores it in `localStorage` (`prohori_token`); selected device in `prohori_selected_device`.
- Never hardcode a device ID; never read `req.user.device` / `user.device` (removed in Phase 6); never read `user.username` (removed in Phase 7).
- Never trust a role, district or device ID from the request body/params without the server-side check described above.
- Uniqueness and integrity rules live in database indexes and atomic updates, not just controllers.
- Never use `io.emit` for reading data; always target a `device:<deviceId>` room, derived from the source stream.
- Same 404/403 message whether a resource does not exist or is out of scope (no information leak).
- The MQTT bridge must validate device IDs against the seeded `devices` collection before writing.
- Logout must disconnect the socket and clear the saved selected device.
- Client reads server errors from `err.response?.data?.error?.message`.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`, `JWT_SECRET`, `ADMIN_*` in `server/.env`; `VITE_API_URL` in `client/.env`; broker settings in `mqtt-bridge/.env` and `mimic-device/.env`. Commit `.env.example` with placeholders only; confirm no `.env` is tracked.
- Material Symbols icon names must be verified (`thermostat`, `call`, `account_circle`, `expand_more`, `check`, `add`, `person`, `group`, `pending_actions`).
- Dev tips: `EADDRINUSE` on port 5000 → find with `netstat -ano | findstr :5000`, stop with `taskkill /PID <pid> /F`. In PowerShell, `$`-style Mongo operators inside `node -e "..."` are interpreted as variables; use single quotes or a script file.

## Threshold / Alert Logic (ACTIVE, unchanged — one global table for all roles)

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

- Humidity and temperature are two-sided. Methane has a gap between 5,000 and 50,000 — implement exactly as given.
- Zones are computed **server-side**; the frontend renders a `zone` field. Daily averages classify the averaged value; calendar min/max classify independently (shared indicator uses the more severe).
- Visual indication only — no push/email/SMS/sound alerts. Managers see the same zones as farmers.
- If the company revises thresholds, update this table first.

## Known Temporary Workarounds (Still Open)

- `getHistory`/`getDailyAverages` use document-count `.limit()` windowing instead of a `Date.now()`-relative `$gte` filter. Search `TODO(revert-for-production)` in `readingsController.js`.
- `getDailyAverages` / calendar grouping uses UTC; may need `timezone: "Asia/Dhaka"`.
- `useReadingsHistory.js` and `GET /api/readings/history` are unused — removal candidates.
- Socket JWT, role and device list are only checked at handshake.
- A device approved by mistake stays on that account (no unlink).
- A manager's initial password is set by the admin; there is no forced-change or reset-by-email flow.
- Admin cannot edit or restore a removed manager (re-adding uses a different email, or direct DB fix).

## Out of Scope (Deferred beyond Phase 7)

- Messaging between farmer and manager (farmer only sees the manager's name and a call link)
- Multiple managers per district and automatic manager selection
- Farms / cow rooms hierarchy
- Audit-log module and activity history pages (requests only store `decidedBy`/`decidedAt`)
- Per-manager (local) thresholds, persisted alerts, acknowledge/escalate workflows
- MQTT topic administration / health pages; managers registering new devices
- Unlink / re-link device flow, device nicknames, device limit per account
- Password reset / email verification / email invites
- Push/email/SMS notifications
- Export/download data
- Login timing-side-channel hardening; periodic socket JWT re-validation

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Socket.IO + Change Streams, simulator, daily-average charting, reading log, calendar.
- **Phase 3 (COMPLETE)**: MQTT pipeline (`mimic-device/` + `mqtt-bridge/`).
- **Phase 4 (COMPLETE)**: JWT/bcrypt auth, device linking, `Reading` factory, seeded `devices`, route guards.
- **Phase 5 (COMPLETE)**: Six devices, one account per device (unique partial index), per-device socket rooms.
- **Phase 6 (COMPLETE)**: Multiple devices per user, `?deviceId=` + `resolveDevice`, `DeviceSwitcher`, add-device flow.
- **Phase 7 (IN PROGRESS)**: RBAC — roles (admin / manager / farmer), district-based single manager, farmer registration with name + division/district, device-request approval, manager panel, admin panel (manager add/delete), profile pages for all roles, phone + call link.