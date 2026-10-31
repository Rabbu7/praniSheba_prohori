# PAGES.md

> Defines the screens/pages/sections that exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 7 — Pages & Sections — STATUS: COMPLETE

Phase 7 added **role-based access**: `farmer` (existing site, extended), `manager` (new panel) and `admin` (new panel). All pages follow `DESIGN.md` tokens (same Sidebar/Header layout, cards, tables, status pills). No new colors. No Phase 8 pages are defined yet.

### Roles at a glance

| Role | Home | Sidebar items |
|---|---|---|
| Farmer | `/` | Dashboard, History, Calendar, My Devices, Profile (Settings disabled) |
| Manager | `/manager` | Overview, Farmers, Requests, Profile |
| Admin | `/admin` | Overview, Managers, Profile |

Mobile uses the bottom navigation with the same items per role (short labels). The header's `account_circle` icon links to `/profile` for every role. Manager and admin headers hide the device label, switcher, status badge and last-updated chip.

---

## Shared pages

### Page: Register (`/register`)

Farmers only.
- Fields: **First name**, **Last name**, **Email address**, **Division** (dropdown), **District** (dropdown, filtered by the division and disabled until a division is chosen; changing the division clears the district), **Password**, **Confirm password**.
- Division/District options come from `GET /api/meta/locations`.
- Inline validation (all fields required; passwords must match; password at least 8 characters). Server errors (e.g. "Email already in use") are read from `err.response.data.error.message`.
- On success: a new farmer lands on `/devices`.
- Footer link to Login. Layout: `AuthShell`.

### Page: Login (`/login`)

Email + password. Generic error "Invalid email or password". After login, redirect by role: admin → `/admin`, manager → `/manager`, farmer → `/complete-profile` (profile incomplete), `/devices` (no approved device) or `/`.

### Page: Complete profile (`/complete-profile`) — farmers only

One-time step for migrated farmers who have no name/division/district.
- Heading "Complete your profile". Fields: First name, Last name, Division, District, Phone (optional). Button "Save and continue".
- Cannot be skipped: the route guard sends the farmer here from every farmer page until saved.
- On success → `/` (or `/devices` if no approved device). Uses `AuthShell`, no Sidebar/Header.

### Page: Profile (`/profile`) — all roles

Inside the normal authenticated layout for the role.

**Card 1 — Personal information** (editable form)
- Farmer: first name, last name, phone (optional), division, district. Email read-only.
- Manager: first name, last name, phone. Email, division and district read-only (changed only by the admin).
- Admin: first name, last name, phone (optional). Email read-only.
- Save button, success message "Profile updated", inline errors.

**Card 2 — Change password**
- Current, new, confirm. Inline errors ("Current password is incorrect", mismatch, minimum 8 characters).

**Role-specific card**
- **Farmer — "Your manager":** manager's full name and phone with a **call icon link** (`tel:`) and the district. If none: "No manager assigned yet".
- **Manager — "Your district":** division and district, plus farmer and device counts.
- **Admin:** none.

Logout stays on the Sidebar.

---

## Farmer pages

### Dashboard (`/`), Reading Log (`/history`), Calendar (`/calendar`)

Selected-device switching, live updates filtered by `device_id`, 7d/30d range, pagination, calendar min/max. The page bodies are shared view components (`DashboardView`, `HistoryView`, `CalendarView`) that take a `deviceId`. The **DeviceSwitcher** lists only **approved** devices. Its last row, **"Request device"**, opens the request dialog on `/devices`. Farmers with no approved device are redirected to `/devices`.

### Page: My Devices (`/devices`)

- Lists the farmer's device requests, newest first: **Device ID** (monospace), **Requested on**, **Status** pill, **Note**, Action.
  - `pending` → "Pending approval" (amber pill)
  - `approved` → "Approved" (green pill) with an "Open dashboard" button that selects that device and goes to `/`
  - `rejected` → red/grey pill with the manager's note if any
  - Approved devices that existed before Phase 7 (no request record) are listed as Approved.
- Button "Request device" opens the request dialog. Empty state: "You have no devices yet." with the same button.
- If the farmer's district has no manager, an info banner: "No manager is assigned to your district yet. Your requests will be reviewed once a manager is available."
- After a successful request, the banner "Request sent. Your manager will review it." shows.
- While any request is pending, the app refetches `/api/auth/me` every 30 seconds and on tab focus; when a request becomes approved the device appears, the socket reconnects, and the status updates without a manual reload.
- If opened with router state `{ openRequest: true }` (from the DeviceSwitcher), the dialog opens on mount and the state is cleared so a refresh does not reopen it.

### Request device dialog (opens from My Devices)

A floating dialog over a dimmed backdrop (sidebar and header stay visible behind it). There is no separate page; `/link-device` redirects to `/devices`.
- Heading "Request a Prohori device". Hint: "Use the device ID and code provided with your Prohori monitor."
- Fields: Device ID (placeholder "e.g. G3036") and Device code. The Device ID field is focused on open.
- Buttons: "Cancel" and "Request device" ("Sending request..." while submitting; both disabled then). Closes on Escape, backdrop click or Cancel, but not while submitting. Body scroll is locked while open. Form and error reset on each open. Mobile: full width with margins, scrollable.
- Inline errors (typed values are kept):
  - Wrong ID/code or empty fields → "Invalid device ID or code" (generic, never says which field).
  - Already owned by this farmer → "You have already added this device".
  - Owned by another account → "This device is already linked to another account".
  - Already requested by this farmer → "You already have a pending request for this device".
  - Pending from another account → "This device already has a pending request from another account".
- On success: the dialog closes, the request list reloads, the banner shows, and pending-sync starts.

---

## Manager pages (role `manager`; district-scoped, read-only for data)

All data is limited to farmers in the manager's district. Anything out of scope behaves as "not found".

### Manager Overview (`/manager`)
- Title "Overview" with district and division. Metric cards: **Farmers**, **Devices**, **Pending requests** (real counts). A "Pending requests" preview (max 5) with a "View all" link.

### Farmers (`/manager/farmers`)
- Table of active farmers: Name, Email, Phone (call icon `tel:` link), Devices (count). Client-side search by name/email. Row click opens the detail. Empty state: "No farmers in your district yet."

### Farmer detail (`/manager/farmers/:farmerId`)
- Info card: name, email, phone (call link), division, district.
- Devices card: the farmer's approved devices with an online/offline pill (5-minute rule); each links to its read-only view.
- Unknown or out-of-district `farmerId` → "Farmer not found" (same for both).

### Farmer device view (`/manager/farmers/:farmerId/devices/:deviceId`) — read-only
- Tabs Dashboard / Reading Log / Calendar using the shared view components. Live readings via the manager socket (opened only here, closed on leaving; REST works if the socket fails).
- Shows the farmer's name and the device ID with a back link. No DeviceSwitcher, no request button.
- Invalid or out-of-scope device → "Device not found".

### Requests (`/manager/requests`)
- Tabs **Pending** (default), **Approved**, **Rejected**.
- Pending rows: Farmer name, Device ID, Requested on, **Approve** and **Reject** (Reject opens a confirm box with an optional note, max 200 chars). Buttons are disabled while a request is in flight.
- Inline result messages; on a 409 the server message shows and the list reloads (the request moves to Rejected).
- Approved/Rejected rows show the decided date and the note. Per-tab empty states, e.g. "No pending requests".

---

## Admin pages (role `admin`)

Admin sees **no sensor readings** and opens no socket.

### Admin Overview (`/admin`)
Metric cards: **Managers**, **Farmers**, **Devices** (approved), **Unmanaged districts**. Real counts only.

### Managers (`/admin/managers`)
- Table of active managers: Name, Email, Phone, Division, District, Farmers (count), Created on, **Delete**.
- **Add manager** opens a dialog: First name, Last name, Email, Phone, Division and District (dependent dropdowns), Initial password. Inline errors keep typed values: "Email already in use", "This district already has a manager", validation messages (required fields, phone format, password at least 8 characters).
- **Delete** opens a confirm dialog: "Delete <name>? Their district will have no manager until a new one is added. Farmers and devices are not affected." Soft delete; the row disappears.
- Empty state: "No managers yet." Buttons are disabled while a request is in flight.

---

## Route Guard Summary (single source of truth for `App.jsx`)

| State | Farmer pages `/`, `/history`, `/calendar` | `/devices`, `/profile` | `/complete-profile` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` |
| Farmer, complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile` shown; others → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile` shown; others → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

`/link-device` redirects to `/devices`. A minimal loading state renders while the initial `/api/auth/me` check is in flight.

---

## Phase 7 Acceptance Checks (all passed)

1. **Migration:** existing users became `farmer`/`active`, kept their devices, lost `username`; re-running changes nothing. `seedAdmin.js` creates one admin and is safe to re-run. The old `username` index is gone; the district-manager and pending-device indexes exist.
2. **Register:** requires first name, last name, division, district; a district not in the division is rejected; a `role` in the body is ignored.
3. **Complete profile:** a migrated farmer is forced to `/complete-profile` from every farmer page; after saving, access works.
4. **Admin / managers:** unique email and unique active district enforced; soft delete frees the district, farmers unaffected; a removed manager cannot log in or use an old token (401); admin gets 403 on every `/api/readings/*` route and cannot open a socket.
5. **Device request flow:** pending request has no readings access; a second farmer requesting the same device gets 409; approval adds the device, the farmer's page flips to Approved without a reload and live updates arrive; rejection shows the note and allows retry; approving a device owned elsewhere → 409 and the request is auto-rejected.
6. **District scoping:** manager A cannot list, open or read farmers/devices/requests of district B (404/403), a missing `deviceId` gives 400, and A receives no live events for B's devices.
7. **Unmanaged district:** farmers there can register, request devices and use the app; the profile shows "No manager assigned yet"; once a manager is added, they see the farmer and the pending request.
8. **Farmer ↔ manager visibility:** farmer's profile shows the manager's name and a working `tel:` link; manager sees each farmer's data read-only.
9. **Profiles:** every role can open `/profile` from the header icon, edit permitted fields, and change the password (wrong current password rejected).
10. **Guards:** each role is redirected to its own home from other roles' routes; a farmer with only pending requests lands on `/devices` (no loop); switching roles in one tab shows the correct panel and clears the saved selected device.
11. **Request dialog:** opens from My Devices and the DeviceSwitcher, closes on Escape/backdrop/Cancel, keeps typed values on error, and does not reopen on refresh; `/link-device` redirects to `/devices`.

---

## Explicitly NOT built (future phases)

- Messaging between farmer and manager
- Multiple managers per district / automatic manager selection
- Farms and cow rooms
- Audit-log and activity-history pages
- Per-manager thresholds, persisted alerts, acknowledge/escalate
- MQTT admin / health pages; managers registering new devices
- Unlink / re-link device; device nicknames
- Password reset, email verification, email invites
- Push/email/SMS notifications
- Settings page
- OAuth / third-party login
- Export/download data

---

## Phase History

- **Phase 1**: Single dashboard page — header/status, polling-based current readings, threshold indicators, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, simulator, daily-average charting, reading log page, calendar min/max view.
- **Phase 3 (COMPLETE)**: MQTT pipeline replaced the direct-to-Mongo simulator.
- **Phase 4 (COMPLETE)**: Authentication (Register/Login), Link Device, route guards, data scoped to the linked device.
- **Phase 5 (COMPLETE)**: Six devices, one account per device, per-device socket rooms.
- **Phase 6 (COMPLETE)**: Multiple devices per user, header device switcher, "Add device" flow.
- **Phase 7 (COMPLETE)**: RBAC — farmer / manager / admin, district-based manager, device-request approval via a request dialog, manager and admin panels, profile pages for all roles.