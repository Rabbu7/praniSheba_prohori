# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 10 — Localization (English and Bangla) (COMPLETE)

Phase 10 adds full bilingual support (English and Bangla) across the entire application interface, including authentication, farmer dashboard and views, manager views, admin views, profile views, dialogs, error messages, and location selectors.

### Phase 10 stages

- **10a** Docs (DONE) · **10b** Infrastructure (DONE) · **10c** Translate pages by group (DONE) · **10d** Server messages and locations (DONE) · **10e** Verification (DONE) · **10k** Localization fixes (DONE) · **10l** Final localization fixes (DONE) · **10m** Dead-key cleanup (DONE)

### Phase 10 decisions (authoritative)

1. **Languages supported:** English (`en`, default) and Bangla (`bn`).
2. **Storage:** Client-side only in `localStorage` under key `prohori_lang`. Persists across reloads and authentication transitions. No backend schema change, no session cookies.
3. **Numerals & units:** Sensor reading numbers, chart axis tick numbers, calendar min/max cell numbers, and physical units (`ppm`, `%`, `°F`) stay in Latin digits across both languages for readability and IoT consistency.
4. **Core domain terminology:**
   - Metrics: Ammonia (`অ্যামোনিয়া`), Methane (`মিথেন`), Humidity (`আর্দ্রতা`), Temperature (`তাপমাত্রা`).
   - Zones / Alert levels: Safe (`নিরাপদ`), Warning (`সতর্কতা`), Danger (`বিপদ`).
   - Devices / Requests: Approved (`অনুমোদিত`), Pending (`অপেক্ষমান`), Rejected (`প্রত্যাখ্যাত`), Unlinked (`সংযোগ বিচ্ছিন্ন`).
5. **Typography & fonts:** Google Font `Noto Sans Bengali` imported in `client/index.css` and added to the font-sans stack to ensure clean Bangla rendering on all devices without layout distortion.
6. **Date and time formatting:** `dateFormatter.js` accepts active locale (`en-US` vs `bn-BD`) while preserving UTC+6 `Asia/Dhaka` calculations and day boundaries. Relative time (alerts, reading cards) localized.
7. **Canonical location storage:** Division and district values sent to and stored in the database remain canonical English strings (`server/src/utils/locations.js`). Display names in dropdowns and profile tables are translated through localized mappings.
8. **Error translation:** Server errors formatted as `{ error: { code, message, status } }` are translated via `translateError(err, fallbackKey)` matching `error.code` against the active locale, falling back safely if no code matches.
9. **No external i18n bloat:** Pure React context (`LanguageContext`) with nested dictionary lookup and parameterized strings (`t('key', { var })`). Relative time is localized via `Intl.RelativeTimeFormat`. No external i18next runtime dependencies.

## Previous Phase: Phase 9 — Hardening, Cleanup, Reliability and Account Management (COMPLETE)

Phase 9 hardened security and reliability, removed leftover cleanup candidates, added `error.code` for Phase 10 localization, and added account/device management features.

### Phase 9 stages (all done)

- **9a** Docs · **9b** Security hardening · **9c** Cleanup · **9d** Reliability and robustness · **9e** Account and device management · **9f** Verification · **9g** Follow-up fixes

### Phase 9 decisions (authoritative)

1. **Security hardening (9b):**
   - Rate limiting on `POST /api/auth/login` (with `skipSuccessfulRequests: true`) and `POST /api/auth/register`.
   - `helmet` security headers and an explicit JSON body size limit.
   - Mongo operator-injection sanitizing pass on `req.body` (`sanitizeInput`) plus per-route query validation (`rejectOperatorKeys`, returning `400 INVALID_QUERY_PARAMETERS` for keys starting with `$`, containing `.`/`[`/`]`, or non-string values) on `/api/readings/*`, `/api/alerts`, `/api/manager/device-requests`, and `/api/admin/managers`.
   - Forced first-login password change: `mustChangePassword` boolean on `User` (default `false`); set `true` when an admin creates a manager or resets a manager's password; cleared on password change (`POST /api/profile/password` also rejects `newPassword === currentPassword` with `400 PASSWORD_UNCHANGED`). Enforced by route guard on the client and middleware/controller checks on the server.
   - Login timing side-channel protection: always run `bcrypt.compare` even when the user does not exist.
   - Periodic re-validation of socket JWT, user `status`, and device access so a removed manager's open socket is dropped (and unlinked devices are removed from rooms).
   - Startup env validation: `JWT_SECRET` (minimum length), `MONGO_URI`, `CLIENT_ORIGIN`, and `ADMIN_*` for the seed script; fail fast with a clear message.
   - Secrets hygiene: add `.env` to `client/.gitignore`, replace real-looking broker IP/username in `mimic-device/.env.example` (and its README) with placeholders, and audit git history for anything real that needs rotating.
2. **Cleanup (9c):**
   - Remove `client/src/hooks/useReadingsHistory.js`, `GET /api/readings/history`, and `getReadingsHistory` in `client/src/services/api.js`.
   - Remove `client/stitch-export.html`, unused Vite template assets (`App.css`, `react.svg`, `vite.svg`, `icons.svg`, template favicon), README leftover lines, and all `simulator/` references (including root `.gitignore`).
   - Empty the "Cleanup Candidates" section in `AGENTS.md`.
3. **Reliability and robustness (9d):**
   - Every server error includes a stable `code` field: `{ error: { code, message, status } }` (additive so existing clients keep working; Phase 10 translates by `code`).
   - Graceful shutdown: close change streams, the Socket.IO server, and the MongoDB connection.
   - Structured logging with no secrets or passwords.
   - `/health` also checks the MongoDB connection state.
   - Global React `ErrorBoundary` and one consistent "server unreachable" state across pages.
   - Include `farmerId` in alert serialization (`serializeAlert`) so manager bell rows navigate directly to `/manager/farmers/:farmerId/devices/:deviceId`.
4. **Account and device management (9e):**
   - **Unlink device:** manager (within their district) or admin removes a device from a farmer via atomic `$pull`; farmer's socket room/connection updates, open alerts for that device are resolved, and the device becomes requestable again.
   - **Device nicknames:** optional `nickname` on each `user.devices` entry (`{ deviceId, nickname, linkedAt }`), shown in `DeviceSwitcher` and tables while `deviceId` remains the real identifier.
   - **Restore removed manager:** admin sets `status` back to `'active'`, subject to the unique active-manager-per-district partial index.
   - **Admin reset of a manager's password:** admin sets a temporary password and sets `mustChangePassword: true` so the manager is forced to change it on next login (reuses the 9b flow).
   - **Export reading log as CSV:** scoped through `resolveDevice`, date range required, row cap enforced, triggered from one button on the Reading Log page.

**Not in Phase 9:** deployment, email-based flows (reset, verification, invites), offline-device alerts, messaging, multiple managers per district, farms and cow rooms, audit log, per-manager thresholds, a Settings page.

## Previous Phase: Phase 8 — Alerts and Data Correctness (COMPLETE)

Phase 8 turned the visual zones into recorded, notified alerts and replaced the temporary data-window workarounds with real Asia/Dhaka time windows. It added no new roles and no new routes.

### Phase 8 stages (all done)

- **8a** Docs · **8b** Real time windows + Asia/Dhaka · **8c-1** Alert core (model, readable-devices helper, detection engine, sockets) · **8c-2** Alert endpoints · **8d** Notification bell · **8e** Chart upgrade (metric selector + threshold bands + `GET /api/meta/thresholds`).

### Phase 8 decisions (authoritative)

1. Alerts are per device; read-state is per user (`readBy`).
2. One open alert per device and metric. A worse or different non-safe zone closes the old alert and opens a new one; returning to safe only sets `resolvedAt`.
3. Debounce: a zone change counts only after **2 consecutive readings** in the new zone.
4. `/api/alerts` does **not** use `resolveDevice`; it scopes through `getReadableDeviceIds(user)`.
5. Timezone is `Asia/Dhaka` (UTC+6, no DST) for averages, calendar and day bounds.
6. Zones live only in `thresholds.js`. If Pranisheba corrects the methane gap, only that file and the table below change.
7. In-app delivery only. No push, email or SMS.

## Previous Phase: Phase 7 — Role-Based Access Control (COMPLETE)

Phase 7 added **three roles** and two new panels on top of the Phase 6 multi-device dashboard.

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
- `requireRole(...roles)` middleware (after `requireAuth`) returns 403 `{ error: { code: 'FORBIDDEN', message: 'Forbidden', status: 403 } }` for other roles.
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
  devices: [{ deviceId, nickname, linkedAt }], // APPROVED devices only (farmers); default []
  mustChangePassword: Boolean,            // default false; true for admin-created/reset managers
  createdBy: ObjectId | null,             // admin who created a manager
  createdAt: Date
}
```

- **`username` is removed** everywhere. Login is email + password. Declare every index in the schema, never by hand.
- Keep the unique partial index on `devices.deviceId` (a device belongs to at most one account).
- `profileComplete` is **derived**: for a farmer, true when `firstName`, `lastName`, `division` and `district` are all non-empty. Managers and admins are always complete.
- `publicUser(user)` (`utils/publicUser.js`) returns: `{ id, firstName, lastName, email, role, status, division, district, phone, devices, mustChangePassword, profileComplete, manager }` where `manager` is `{ firstName, lastName, phone }` for a farmer whose district has an active manager, otherwise `null`. Never return `passwordHash`.

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
- All server errors keep the shape `{ error: { code, message, status } }`; the client translates errors via `translateError(err, fallbackKey)` using `error.code` against the active locale.

#### Server Error Codes (Audited)

| Error Code | Status | Message |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Invalid email or password |
| `EMAIL_IN_USE` | 409 | Email already in use |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Forbidden |
| `PASSWORD_CHANGE_REQUIRED` | 403 | Password change required |
| `CURRENT_PASSWORD_INCORRECT` | 400 | Current password is incorrect |
| `PASSWORD_UNCHANGED` | 400 | New password must be different from the current password |
| `INVALID_PASSWORD` / `PASSWORD_TOO_SHORT` | 400 | Password must be at least 8 characters |
| `INVALID_REGISTRATION_DETAILS` | 400 | Invalid registration details |
| `INVALID_FIRST_NAME` / `INVALID_LAST_NAME` | 400 | Name must be between 1 and 50 characters |
| `NAME_REQUIRED` | 400 | First name and last name are required |
| `INVALID_PHONE` / `PHONE_INVALID` | 400 | Phone number is required and must be valid |
| `INVALID_LOCATION` | 400 | District does not belong to the selected division |
| `INVALID_NICKNAME` | 400 | Nickname must be 50 characters or fewer |
| `INVALID_QUERY_PARAMETERS` | 400 | Invalid query parameters |
| `INVALID_EMAIL` | 400 | Please enter a valid email address |
| `BAD_REQUEST` | 400 | Invalid request |
| `NOT_FOUND` | 404 | Requested resource not found |
| `CONFLICT` | 409 | A conflict occurred with existing data |
| `PAYLOAD_TOO_LARGE` | 413 | Uploaded data is too large |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `REQUEST_ERROR` | 400 | Request failed. Please try again. |
| `DISTRICT_HAS_MANAGER` | 409 | This district already has a manager |
| `MANAGER_NOT_FOUND` | 404 | Manager not found |
| `FARMER_NOT_FOUND` | 404 | Farmer not found |
| `NO_DEVICE_LINKED` | 403 | No device linked |
| `DEVICE_ID_REQUIRED` | 400 | deviceId is required |
| `DEVICE_NOT_FOUND` | 403 / 404 | Device not found for this account |
| `INVALID_DEVICE_CREDENTIALS` | 400 | Invalid device ID or code |
| `DEVICE_ALREADY_OWNED` | 409 | You have already added this device / Already added |
| `DEVICE_LINKED_OTHER` / `DEVICE_ALREADY_LINKED` | 409 | This device is already linked to another account |
| `DEVICE_REQUEST_PENDING_SELF` | 409 | You already have a pending request for this device |
| `DEVICE_REQUEST_PENDING_OTHER` | 409 | This device already has a pending request from another account |
| `INVALID_REQUEST_STATUS` | 400 | Invalid request status |
| `REQUEST_NOT_FOUND` | 404 | Request not found |
| `REQUEST_NOT_PENDING` | 409 | Request is no longer pending |
| `INVALID_REJECTION_NOTE` | 400 | Invalid rejection note |
| `ALERT_NOT_FOUND` | 404 | Alert not found |
| `NO_READINGS_FOUND` | 404 | No readings received yet |
| `NO_READINGS_FOR_DATE` | 404 | No readings recorded for this date |
| `INVALID_DATE` / `INVALID_DATE_RANGE` | 400 | Invalid date specified / range |

### Device requests (farmer → manager approval)

Model `DeviceRequest` (collection `devicerequests`):

```js
{
  farmerId: ObjectId,         // ref User
  deviceId: String,
  status: 'pending' | 'approved' | 'rejected' | 'unlinked',
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

Topic `prohori/<deviceId>/reading`. `mimic-device/` publishes for all six devices (QoS 1, non-retained, independent random-walk state per device). `mqtt-bridge/` subscribes to `prohori/+/reading`, validates the device ID **from the topic** against the seeded `devices` collection (refreshed every 60s), drops unknown IDs, validates numeric payloads, forces `device_id` to match the topic, sets `created_at` (UTC), and is the **sole writer**. The abandoned topic `farm_controller/CATTLE_CTRL_001/event` must never be used.

### Socket.IO rooms

- `socketAuth.js` verifies the JWT, loads the user fresh, and rejects (generic "Authentication required") if the token is missing/invalid/expired, the user does not exist, `status !== 'active'`, or there are no readable devices. It sets `socket.data.userId`, `socket.data.role`, `socket.data.deviceIds`:
  - **farmer:** their approved `devices`.
  - **manager:** every device of every active farmer in the manager's district (loaded at handshake, via `getReadableDeviceIds`).
  - **admin:** rejected.
- `app.js` joins one room `device:<id>` per ID in `socket.data.deviceIds`. IDs come only from the server-loaded list. No client-triggered join.
- `changeStream.js` emits `new-reading`, `new-alert` and `alert-resolved` only to `io.to('device:' + deviceId)`. No global `io.emit` anywhere in `server/`.
- The client filters live events by `payload.device_id` (unchanged).
- **Handshake data is a snapshot.** A client must reconnect (`disconnectSocket()` then `connectSocket(token)`) when its device list changes:
  - farmer: `useFarmerSync` polls `/api/auth/me` every 30 s and on tab focus while a request is pending (started on mount if any request is pending, and right after a successful new request), and reconnects the socket when the approved device IDs change.
  - manager: the socket is opened only on the farmer device view (once on entry) and closed on leaving. Managers and admins never open a socket elsewhere. The REST fetch must work even if the socket fails (`connect_error` is tolerated).
- Known limitations (accepted): JWT, role and device list are verified only at handshake; a manager or admin with no device IDs cannot connect; an already-open socket of a removed manager stays connected until it disconnects.

### Alerts (Phase 8)

Model `Alert` (collection `alerts`):

```js
{
  deviceId: String,
  metric: 'ammonia' | 'methane' | 'humidity' | 'temperature',
  zone: 'warning' | 'danger',      // only non-safe zones create an alert
  value: Number,                   // reading value that triggered it
  createdAt: Date,                 // the triggering reading's created_at
  resolvedAt: Date | null,         // set when the metric returns to safe or changes zone
  readBy: [ObjectId]               // users who marked it read; never returned to clients
}
```

- Indexes (declared in the schema, synced by `seedDevices.js` via `Alert.syncIndexes()`): `{ deviceId: 1, createdAt: -1 }`, and a unique partial index on `{ deviceId: 1, metric: 1 }` where `resolvedAt: null` (one open alert per device+metric).
- **Detection** lives in `sockets/changeStream.js`, driven by the pure state machine in `utils/alertEngine.js` (`createAlertEngine()` with `seed` and `process`). It keeps the last confirmed zone per `deviceId:metric` in memory and confirms a change after 2 consecutive readings in the new zone; a single flapping reading produces nothing.
- **Startup:** each device is seeded from its latest reading **without** creating alerts (no readings → all safe). Open alerts whose zone no longer matches the seeded zone are resolved (reconcile). Nothing is emitted during reconcile.
- **Transitions:** safe→warning/danger = open alert; warning↔danger = resolve the open alert, then open a new one; →safe = resolve only. All writes are atomic (`updateOne` filtered on `resolvedAt: null`, duplicate-key `11000` ignored). Never find-then-save.
- Events for the same device are processed sequentially (per-device promise chain). `new-reading` is emitted first, and an alert error never stops the reading emit or the change stream.
- **Sockets:** `new-alert` (serialized alert) and `alert-resolved` `{ id, deviceId, metric, resolvedAt }`, only to `device:<deviceId>`.
- **Serializer** (`utils/serializeAlert.js`, one shared function): `{ id, deviceId, metric, zone, value, createdAt, resolvedAt, read }`, where `read` is derived for the requesting user. Never return `readBy`, `_id` or `__v`.
- **`utils/readableDevices.js`** exports `getReadableDeviceIds(user)`: farmer = approved devices, manager = devices of active farmers in their district, any other role = `[]`. Used by `socketAuth.js` and the alerts controller (it replaced `getManagerDeviceIds`).

Endpoints (`requireAuth` + `requireRole('farmer', 'manager')`; admin gets 403 "Forbidden", no token 401):

- `GET /api/alerts?limit=20&unreadOnly=true|false&status=open|resolved` → `{ alerts, unreadCount }`, newest first (`createdAt`, `_id` descending), limited to the user's readable devices. `limit` is an integer 1–100. Any invalid or non-string parameter (including `limit[]=1`) → 400 "Invalid query parameters". `unreadCount` counts every unread alert in scope and ignores `status`, `limit` and `unreadOnly`. No readable devices → `{ alerts: [], unreadCount: 0 }`.
- `POST /api/alerts/:id/read` → `{ alert }` with `read: true`. One atomic `updateOne` with `$addToSet`. Invalid, nonexistent or out-of-scope ID → identical 404 "Alert not found". Idempotent.
- `POST /api/alerts/read-all` → `{ success: true }`. Affects only the caller and only in-scope devices.

### Time windows and timezone (Phase 8)

- The document-count `.limit()` workaround is gone. `getDailyAverages` filters with `created_at >= getWindowStart(days)`, where the window starts at the beginning of the Dhaka day `days - 1` days ago, so the first bucket is always a full day.
- All day grouping and day/month bounds use `Asia/Dhaka` (`$dateToString` with `timezone: 'Asia/Dhaka'`; bounds use a fixed +06:00 offset, no library). Helpers are in `server/src/utils/dhakaTime.js`: `DHAKA_TZ`, `dhakaDateKey`, `startOfDhakaDay`, `getWindowStart`, `getDhakaMonthBounds`, `getDhakaDayBounds`.
- Each reading collection has an index on `created_at` (`readingSchema.index({ created_at: -1 })` in `Reading.js`). The reading document shape is unchanged.
- Client: `dateFormatter.js` formats with `timeZone: 'Asia/Dhaka'` and exports `getDhakaToday()` (used for the calendar's starting month and "today" marker) and `formatRelativeTime()`.

### Thresholds endpoint (Phase 8)

- `thresholds.js` exports `THRESHOLDS` next to the zone functions: per metric `{ unit, bands: [{ zone, min, max }] }`, `null` meaning unbounded. The methane span between 5,000 and 50,000 ppm has **no band**, exactly as the table below says.
- `GET /api/meta/thresholds` (no auth) returns `THRESHOLDS`. The client reads it through `useThresholds` (module-level cache). Never copy threshold numbers into the client.
- `THRESHOLDS` and the zone functions must change together. Zone parity was verified at every band boundary.

### Frontend

- `AuthContext` exposes `{ user, token, loading, login, register, logout, setUser, refreshUser }`. `register(firstName, lastName, email, password, division, district)`. `refreshUser()` does not toggle `loading` and only handles 401 (logout). Logout disconnects the socket and clears the saved selected device.
- **Role home** (`utils/roleHome.js`): admin → `/admin`, manager → `/manager`, farmer → `/complete-profile` / `/devices` / `/` by state.
- `DeviceContext` is used by farmer pages. Manager farmer-views pass the farmer's `deviceId` explicitly (read-only) through `useLatestReading(deviceId)` / `useDeviceStatus(deviceId)` and the other data hooks. Never hardcode a device ID in the client (the only allowed literal is the "e.g. G3036" placeholder in `RequestDeviceModal.jsx`).
- Shared view components `components/views/` (`DashboardView`, `HistoryView`, `CalendarView`) take a `deviceId` and are used by both the farmer pages and the manager device view.
- **Request device** is a floating dialog (`components/devices/RequestDeviceModal.jsx`), opened from My Devices (header button and empty state) and from the DeviceSwitcher's "Request device" row (navigates to `/devices` with router state `{ openRequest: true }`, cleared after opening). There is no `/link-device` page; `/link-device` redirects to `/devices`.
- Header: the `account_circle` icon links to `/profile` for every role. The notifications bell is live for farmer and manager (admin keeps the inert icon and makes no `/api/alerts` request). `showDevice={false}` hides the device label/switcher/status/last-updated for manager and admin pages.
- Sidebar items by role:
  - farmer: Dashboard, History, Calendar, My Devices, Profile (Settings stays disabled).
  - manager: Overview, Farmers, Requests, Profile.
  - admin: Overview, Managers, Profile.
- Components stay small and single-purpose; data fetching lives in `hooks/`. New API wrappers go in `services/api.js` with the Bearer interceptor.
- Call links use `<a href={"tel:" + phone}>` with the Material Symbols `call` icon.
- **Notification bell** (`components/layout/NotificationBell.jsx`, fed by one `useAlerts(enabled)` call in `Header`, shared by the mobile and desktop headers). Enabled for farmer and manager; admin keeps the inert icon and makes no `/api/alerts` request. `useAlerts` fetches `getAlerts({ limit: 10 })` on mount, every 60 s and on tab focus, listens on the shared socket for `new-alert` and `alert-resolved` (deduped by id, list capped at 10), and never calls `connectSocket`/`disconnectSocket`. Mark-read is optimistic with `reload()` on failure. Row click: farmer → `selectDevice(deviceId)` then `/`; manager → `/manager/farmers/:farmerId/devices/:deviceId` (falling back to `/manager/farmers` if `farmerId`/`deviceId` is absent).
- **Trend chart** (`TrendChart.jsx`): metric selector (Ammonia, Methane, Humidity, Temperature, default Ammonia), one line at a time from `ammonia_avg`, `methane_avg`, `humidity_avg`, `temperature_avg`, with `ReferenceArea` threshold bands from `useThresholds` drawn behind the line using the status color tokens. The chart still renders without bands if the thresholds request fails.

## Stack

**Backend:** Node.js + Express, Mongoose, Socket.IO (JWT-authenticated per-device rooms), MongoDB Change Streams, `bcrypt` (cost 10), `jsonwebtoken` (7-day expiry, no refresh tokens), dotenv, cors.

**Device pipeline:** `mimic-device/` (Python, fake readings over MQTT), `mqtt-bridge/` (Python, sole writer to reading collections).

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
│   │   ├── config/            # db.js, env.js
│   │   ├── models/            # Reading (factory), User, Device, DeviceRequest, Alert
│   │   ├── controllers/       # auth, profile, deviceRequest, manager, admin, readings, alerts
│   │   ├── utils/             # thresholds, locations, validators, publicUser, managerScope,
│   │   │                      #   readableDevices, alertEngine, serializeAlert, dhakaTime,
│   │   │                      #   logger, errors, unlinkDevice
│   │   ├── routes/            # auth, profile, meta, deviceRequests, manager, admin, readings, alerts
│   │   ├── middleware/        # errorHandler, requireAuth, requireRole, resolveDevice, sanitizeInput
│   │   ├── seed/              # seedDevices (+syncIndexes), migrateDevices (Phase 6, done),
│   │   │                      #   migrateRoles (done), seedAdmin
│   │   ├── sockets/           # changeStream, socketAuth
│   │   └── app.js
│   ├── .env / .env.example    # MONGO_URI, PORT, CLIENT_ORIGIN, JWT_SECRET, ADMIN_*
│   └── package.json
├── mimic-device/   ...unchanged
├── mqtt-bridge/    ...unchanged
├── client/
│   ├── scripts/
│   │   └── check-i18n.mjs     # automated dictionary parity and code usage guard
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/    # Sidebar (role-aware), Header, DeviceSwitcher, NotificationBell
│   │   │   ├── auth/      # AuthShell
│   │   │   ├── devices/   # RequestDeviceModal
│   │   │   ├── dashboard/ # SensorCard, ReadingsPanel, HistoryTable, HistoryTabs, TrendChart
│   │   │   ├── calendar/  # CalendarGrid, DayDetailCards
│   │   │   ├── views/     # DashboardView, HistoryView, CalendarView (take deviceId)
│   │   │   ├── profile/   # ProfileForm, PasswordForm, ManagerCard, DistrictCard
│   │   │   ├── location/  # LocationSelect
│   │   │   └── common/    # StatusBadge, RequestStatusBadge, MetricCard, ConfirmDialog,
│   │   │   │              #   ErrorBoundary, ServerUnreachable, LanguageToggle
│   │   ├── context/       # AuthContext, DeviceContext, LanguageContext
│   │   ├── locales/       # en.json, bn.json (341 keys each)
│   │   ├── pages/         # Login, Register, CompleteProfile, ChangePassword, Dashboard,
│   │   │                  #   History, Calendar, Devices, Profile, manager/*, admin/*
│   │   ├── hooks/         # reading hooks, useLocations, useThresholds, useAlerts, useFarmerSync,
│   │   │                      #   manager/admin data hooks
│   │   ├── services/      # api.js, socket.js
│   │   ├── utils/         # dateFormatter, roleHome, isServerUnreachable, formatRequestNote
│   │   ├── App.jsx        # role-aware route guards
│   │   ├── main.jsx       # LanguageProvider > ErrorBoundary > AuthProvider > DeviceProvider > App
│   │   └── index.css
│   └── package.json
├── AGENTS.md  PAGES.md  DESIGN.md  README.md
```

## Migration (done; must remain idempotent)

`server/src/seed/migrateRoles.js`: users without a `role` get `role: 'farmer'`, `status: 'active'`; the legacy non-sparse `username_1` index is dropped first, then `username` is `$unset`; names/division/district stay empty (forcing `/complete-profile`). Order: `migrateRoles.js` → `seedDevices.js` (syncIndexes) → `seedAdmin.js`. Re-running changes nothing.

## Route Guard Summary (single source for `App.jsx`)

| State | Farmer pages `/`, `/history`, `/calendar` | `/devices`, `/profile` | `/complete-profile` | `/change-password` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Authenticated, `mustChangePassword` | → `/change-password` | → `/change-password` | → `/change-password` | shown | → `/change-password` | → `/change-password` | → `/change-password` |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, profile complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` | → `/` |
| Farmer, profile complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile` shown; others → `/manager` | → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile` shown; others → `/admin` | → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

`/link-device` redirects to `/devices`. While the initial `/api/auth/me` is in flight (`loading: true`), a minimal loading state renders instead of any redirect.

## API Contract

- `POST /api/auth/register` → `{ firstName, lastName, email, password, division, district }` → `{ token, user }` (always a farmer; 409 "Email already in use")
- `POST /api/auth/login` → `{ email, password }` → `{ token, user }`; generic "Invalid email or password"
- `GET /api/auth/me` → `publicUser`
- `GET /api/meta/locations` → `{ [division]: string[] }` (no auth)
- `PATCH /api/profile`, `POST /api/profile/password`, `PATCH /api/profile/devices/:deviceId`
- `POST /api/device-requests`, `GET /api/device-requests/mine` (farmer)
- `GET /api/manager/overview | farmers | farmers/:farmerId | device-requests`, `POST /api/manager/device-requests/:id/approve|reject`, `DELETE /api/manager/farmers/:farmerId/devices/:deviceId` (manager)
- `GET /api/admin/overview`, `GET /api/admin/managers?status=active|removed|all`, `POST /api/admin/managers`, `DELETE /api/admin/managers/:id`, `POST /api/admin/managers/:id/restore`, `POST /api/admin/managers/:id/reset-password`, `DELETE /api/admin/farmers/:farmerId/devices/:deviceId` (admin)
- `GET /api/readings/latest | daily-averages | log | calendar | day/:date | export` — `?deviceId=` rules per role via `resolveDevice` (CORS exposes `X-Export-Truncated`, `X-Export-Row-Cap`, `Content-Disposition`)
- `GET /api/meta/thresholds` → `THRESHOLDS` (no auth)
- `GET /api/alerts`, `POST /api/alerts/:id/read`, `POST /api/alerts/read-all` (farmer, manager; admin 403)
- `GET /health` — no auth; checks MongoDB connection state (`200 { status: 'ok', db: 'connected' }` / `503 { status: 'degraded', db: 'disconnected' }`)
- **Removed:** `POST /api/auth/link-device` (replaced by `POST /api/device-requests`; now 404).
- **Socket.IO:** JWT in `auth.token`; rooms per role; `new-reading` payload matches `/api/readings/latest` (includes `device_id`); `new-alert` (serialized alert) and `alert-resolved` `{ id, deviceId, metric, resolvedAt }` go to the same `device:<id>` rooms.

## Conventions

- Backend: controller/route separation, async/await with try/catch, centralized error middleware, no business logic in route files. Authorization checks are server-side.
- Frontend: functional components + hooks only. Tailwind utility classes only, tokens from `index.css`; no inline hex values in JSX.
- Passwords: bcrypt cost 10; never log or return `passwordHash` or plaintext passwords.
- JWT: 7-day expiry; frontend stores it in `localStorage` (`prohori_token`); selected device in `prohori_selected_device`.
- Never hardcode a device ID; never read `user.device` (removed Phase 6) or `user.username` (removed Phase 7).
- Never trust a role, district or device ID from the request body/params without the server-side check.
- Uniqueness and integrity rules live in database indexes and atomic updates, not just controllers.
- Never use `io.emit` for reading or alert data; always target a `device:<deviceId>` room.
- Alert test fixtures are inserted already **resolved** with a recognizable marker (`value: -999`) so they cannot collide with the unique open-alert index; delete only what you created.
- Same 404/403 message whether a resource does not exist or is out of scope (no information leak).
- Test fixtures: use an isolated email prefix (e.g. `e2e-`) and clean up only those users and their requests. Never `deleteMany({})` on a real collection.
- Mongoose: use `returnDocument: 'after'` (not `new: true`).
- Client translates server errors via `translateError(err, fallbackKey)` using `error.code` against the active locale (never display raw `error.message` directly to the user).
- **Digit Rule:** Sensor reading numbers, chart axis tick numbers, calendar min/max cell numbers, pagination counts, phone numbers, and physical units (`ppm`, `%`, `°F`) stay in Latin digits across both languages for readability and IoT consistency.
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
- Zones drive recorded in-app alerts (see "Alerts (Phase 8)"). No push/email/SMS/sound. Managers see the same zones and alerts as farmers for their district's devices.
- **Open question for Pranisheba:** the methane table jumps from a 5,000 ppm warning ceiling to a 50,000 ppm danger floor. It is implemented exactly as given; confirm before release.
- If the company revises thresholds, update this table first.

## Known Temporary Workarounds / Limitations (Still Open)

- Re-linked devices expose prior historical readings to the new owner (same physical shed; not filtered by `linkedAt`).
- Admin device unlink (`DELETE /api/admin/farmers/:farmerId/devices/:deviceId`) is API-only (no admin farmers UI).
- `app.set('trust proxy', ...)` must be configured in the deployment phase so `express-rate-limit` identifies client IPs behind a reverse proxy.
- Existing JWTs are not revoked on a normal password change (they expire after 7 days; removed managers are rejected via `requireAuth` and periodic `revalidateSocket`).
- A removed manager's email stays taken (email index covers all users).
- Managers/admins with no device IDs cannot open a socket.
- The alert engine keeps its confirmed zones in memory; a server restart re-seeds from each device's latest reading and resolves stale open alerts (no phantom alerts).
- On `/devices` and `/profile` a farmer has no live socket, so the bell updates through the 60 s poll and tab-focus refetch.
- Mongoose may print a deprecation warning on some update options; harmless.

## Cleanup Candidates

*(None — cleared in Phase 9c.)*

## Out of Scope (Deferred beyond Phase 10)

- Deployment (deferred to Final phase)
- Automated unit/API test suite (planned for Phase 11)
- Offline-device alerts (planned for Phase 11+)
- Messaging between farmer and manager
- Multiple managers per district and automatic manager selection
- Farms / cow rooms hierarchy
- Audit-log module and activity history pages
- Per-manager (local) thresholds, acknowledge/escalate workflows
- MQTT topic administration / health pages; managers registering new devices
- Device limit per account
- Email-based flows (password reset, email verification, email invites)
- Push/email/SMS notifications and per-user alert rules
- Settings page

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling updates, threshold-based visual alerts.
- **Phase 2 (COMPLETE)**: Socket.IO + Change Streams, simulator, daily-average charting, reading log, calendar.
- **Phase 3 (COMPLETE)**: MQTT pipeline (`mimic-device/` + `mqtt-bridge/`).
- **Phase 4 (COMPLETE)**: JWT/bcrypt auth, device linking, `Reading` factory, seeded `devices`, route guards.
- **Phase 5 (COMPLETE)**: Six devices, one account per device (unique partial index), per-device socket rooms.
- **Phase 6 (COMPLETE)**: Multiple devices per user, `?deviceId=` + `resolveDevice`, `DeviceSwitcher`, add-device flow.
- **Phase 7 (COMPLETE)**: RBAC — roles (admin / manager / farmer), district-based single manager, farmer registration with name + division/district, device-request approval (dialog-based request flow), manager panel, admin panel (manager add/delete), profile pages for all roles, phone + call link.
- **Phase 8 (COMPLETE)**: Real Asia/Dhaka time windows and indexes, persisted debounced alerts (engine, `/api/alerts`, per-user read state, live socket events), notification bell for farmers and managers, trend chart metric selector with threshold bands and `GET /api/meta/thresholds`.
- **Phase 9 (COMPLETE)**: Security hardening (rate limiting, `helmet`, body limit, Mongo operator sanitization, forced first-login password change, timing-safe login, socket revalidation, startup env validation, secrets hygiene), cleanup, reliability (stable `error.code`, graceful shutdown, structured redacting logger, `/health` DB check, React `ErrorBoundary` + `ServerUnreachable`, `farmerId` on alerts), and account/device management (device nicknames, device unlink, removed-manager restore, admin manager password reset, Reading Log CSV export).
- **Phase 10 (COMPLETE)**: Localization (English and Bangla) — zero-dependency `LanguageContext` + `prohori_lang` persistence (browser auto-detect fallback), `Noto Sans Bengali` font integration, identical English and Bangla JSON dictionaries (341 keys each, 0 unused keys) verified via `npm run i18n:check`, `LanguageToggle` header/shell integration, `Intl.RelativeTimeFormat` date formatting with Latin numerals, complete translations across all authentication, farmer, manager, admin, and profile views, localized divisions/districts, complete server error code translation with network fallback, and dead-key cleanup.
