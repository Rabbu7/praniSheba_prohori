# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 7 — Pages & Sections — STATUS: IN PROGRESS

Phase 7 adds **role-based access**: `farmer` (existing site, extended), `manager` (new panel) and `admin` (new panel). All pages follow `DESIGN.md` tokens (same Sidebar/Header layout, cards, tables, status pills). No new colors. Stages: 7a docs · 7b backend foundation · 7c device requests + manager scoping · 7d admin backend · 7e frontend foundation · 7f manager/admin panels + verification (see `AGENTS.md`).

### Roles at a glance

| Role | Home | Sidebar items |
|---|---|---|
| Farmer | `/` | Dashboard, History, Calendar, My Devices, Profile (Settings disabled) |
| Manager | `/manager` | Overview, Farmers, Requests, Profile |
| Admin | `/admin` | Overview, Managers, Profile |

Mobile uses the existing bottom navigation with the same items per role. The header's `account_circle` icon links to `/profile` for every role.

---

## Shared pages

### Page: Register (`/register`) — changed

Farmers only.
- Fields: **First name**, **Last name**, **Email address**, **Division** (dropdown), **District** (dropdown, filtered by the selected division and disabled until a division is chosen), **Password**, **Confirm password**. The old **Username** field is removed.
- Division/District options come from `GET /api/meta/locations`.
- Validation messages inline in the existing error area (all fields required; passwords must match; password at least 8 characters). Server errors (e.g. "Email already in use") are read from `err.response.data.error.message`.
- On success: farmer with no approved devices → `/devices`; otherwise `/`.
- Footer link to Login. Layout stays `AuthShell`.

### Page: Login (`/login`) — small change

Unchanged fields. After login, redirect by role: admin → `/admin`, manager → `/manager`, farmer → `/complete-profile` (if profile incomplete), `/devices` (no approved device) or `/`.

### Page: Complete profile (`/complete-profile`) — new, farmers only

One-time step for existing (migrated) farmers who have no name/division/district.
- Heading "Complete your profile". Fields: First name, Last name, Division, District, Phone (optional). Button "Save and continue".
- Cannot be skipped: route guard sends the farmer here from every farmer page until saved.
- On success → `/` (or `/devices` if no approved device). Uses `PATCH /api/profile`.
- Uses `AuthShell`, no Sidebar/Header.

### Page: Profile (`/profile`) — new, all roles

Inside the normal authenticated layout (Sidebar + Header for the role). Two cards plus one role-specific card.

**Card 1 — Personal information** (editable form)
- Farmer: first name, last name, phone (optional), division, district. Email shown read-only.
- Manager: first name, last name, phone. Email, division and district shown read-only (changed only by the admin).
- Admin: first name, last name, phone (optional). Email read-only.
- Save button, success message "Profile updated", inline errors.

**Card 2 — Change password**
- Current password, new password, confirm new password. Inline errors ("Current password is incorrect", mismatch, minimum 8 characters).

**Role-specific card**
- **Farmer — "Your manager":** manager's full name and phone with a **call icon link** (`tel:`) and the district. If the district has no active manager: "No manager assigned yet".
- **Manager — "Your district":** division and district, plus counts (farmers, devices).
- **Admin:** none.

Logout stays on the Sidebar.

---

## Farmer pages

### Dashboard (`/`), Reading Log (`/history`), Calendar (`/calendar`) — unchanged content

Behavior from Phase 6 stands (selected-device switching, live updates filtered by `device_id`, 7d/30d range, pagination, calendar min/max). The **DeviceSwitcher** lists only **approved** devices. Its last row is renamed **"Request device"** (was "Add device") and navigates to `/link-device`. Farmers with no approved device are redirected to `/devices`.

### Page: My Devices (`/devices`) — new

- Lists all of the farmer's device requests, newest first, in a table/cards: **Device ID** (monospace), **Requested on**, **Status** pill, **Note**.
  - `pending` → "Pending approval" (amber pill)
  - `approved` → "Approved" (green pill) with a link/button "Open dashboard" that selects that device and goes to `/`
  - `rejected` → "Rejected" (grey/red pill) with the manager's note if any
  - Approved devices that existed before Phase 7 (no request record) are also listed as Approved.
- Button "Request device" → `/link-device`.
- Empty state: "You have no devices yet." with the same button.
- If the farmer's district has no manager, show an info banner: "No manager is assigned to your district yet. Your requests will be reviewed once a manager is available."
- While any request is pending, the page (and the app) refetches `/api/auth/me` every 30 seconds and on tab focus; when a request becomes approved the device appears, the socket is reconnected, and the status updates without a manual refresh.

### Page: Request device (`/link-device`) — changed

Same page/route, now creates a **request**.
- Fields: Device ID, Device code (unchanged). Heading "Request a Prohori device" (first device: "Connect your Prohori device"). Button "Request device" ("Sending request..." while submitting). Cancel link → `/devices` when the farmer already has requests/devices; no Cancel for a brand-new farmer with nothing yet (they stay on this page or `/devices`).
- Success: the farmer is taken to `/devices` and sees the new request as Pending, with a message "Request sent. Your manager will review it."
- Inline errors (typed values kept, form not cleared):
  - Wrong ID/code → "Invalid device ID or code" (generic, never says which field).
  - Already owned by this farmer → "You have already added this device".
  - Owned by another account → "This device is already linked to another account".
  - Already requested by this farmer → "You already have a pending request for this device".
  - Pending from another account → "This device already has a pending request from another account".
- Uses `AuthShell`, no Sidebar/Header (as in Phase 6).

---

## Manager pages (role `manager`; district-scoped)

All data is limited to farmers in the manager's district. Anything out of scope behaves as "not found".

### Page: Manager Overview (`/manager`) — new

- Header title "Overview" with the district and division shown (e.g. "Dhaka · Dhaka Division").
- Summary cards (metric-card style from `DESIGN.md`): **Farmers**, **Devices**, **Pending requests**. Real counts only.
- A short "Pending requests" preview (up to 5 rows) with a "View all" link to `/manager/requests`.

### Page: Farmers (`/manager/farmers`) — new

- Table of active farmers in the district: Name, Email, Phone (call icon link), Devices (count). Search box filters by name/email.
- Clicking a row opens the farmer detail.
- Empty state: "No farmers in your district yet."

### Page: Farmer detail (`/manager/farmers/:farmerId`) — new

- Farmer information card: name, email, phone (call link), division, district.
- Devices card: list of the farmer's approved devices (ID, latest reading time, online/offline pill using the existing 5-minute rule). Each device links to its read-only view.
- Unknown or out-of-district `farmerId` → "Farmer not found" state (same for both).

### Page: Farmer device view (`/manager/farmers/:farmerId/devices/:deviceId`) — new, read-only

- Reuses the existing Dashboard, Reading Log and Calendar components for that device, with tabs "Dashboard / Reading Log / Calendar". Live readings update via the manager's socket rooms (filtered by `device_id`).
- Header shows the farmer's name and the device ID; no DeviceSwitcher outside that farmer's devices, no "Request device".
- Read-only: there are no controls that change data.
- Invalid or out-of-scope device → "Device not found".

### Page: Requests (`/manager/requests`) — new

- Tabs: **Pending** (default), **Approved**, **Rejected**.
- Pending rows: Farmer name, Device ID, Requested on, **Approve** and **Reject** buttons. Reject opens a small confirm box with an optional note (max 200 chars).
- Inline result messages: success, or the 409 messages when the device became unavailable ("Already added" / "Already linked to another account" — the request is then moved to Rejected automatically).
- After an approval the manager's socket is reconnected so the new device's room is included.
- Approved/Rejected rows show who decided and when (decider is always the current manager's district manager).
- Empty state per tab, e.g. "No pending requests".

---

## Admin pages (role `admin`)

Admin sees **no sensor readings**.

### Page: Admin Overview (`/admin`) — new

Summary cards: **Managers**, **Farmers**, **Devices** (approved), **Unmanaged districts** (districts with farmers but no manager). Real counts only.

### Page: Managers (`/admin/managers`) — new

- Table of active managers: Name, Email, Phone, Division, District, Farmers (count), Created on, and a **Delete** action.
- **Add manager** button opens a form (modal or dedicated panel): First name, Last name, Email, Phone, Division, District (dependent dropdowns), Initial password. Inline errors:
  - "Email already in use"
  - "This district already has a manager"
  - validation messages (phone format, password at least 8 characters)
- **Delete** opens a confirm dialog: "Delete <name>? Their district will have no manager until a new one is added. Farmers and devices are not affected." Soft delete; the row disappears from the list.
- Empty state: "No managers yet."

---

## Route Guard Summary (single source of truth for `App.jsx`)

| State | Farmer pages `/`, `/history`, `/calendar` | `/link-device`, `/devices`, `/profile` | `/complete-profile` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` |
| Farmer, complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile` shown; others → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile` shown; others → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

A minimal loading state renders while the initial `/api/auth/me` check is in flight.

---

## Phase 7 Acceptance Checks

1. **Migration:** existing users become `farmer`/`active`, keep their devices, lose `username`; re-running changes nothing. `seedAdmin.js` creates one admin and is safe to re-run. Old `username` index is gone; the district-manager and pending-device indexes exist.
2. **Register:** new farmer requires first name, last name, division, district; district not in the division → rejected; a `role` field in the request body is ignored (always farmer).
3. **Complete profile:** a migrated farmer is forced to `/complete-profile` from every farmer page; after saving, normal access works.
4. **Admin / managers:** admin adds a manager (unique email and unique active district enforced, second manager in the same district → 409); deletes a manager (soft delete) → district unmanaged, farmers unaffected, removed manager can no longer log in or use an old token (401); admin cannot delete an admin or themselves; admin gets 403 on every `/api/readings/*` route and cannot open a socket.
5. **Device request flow:** farmer requests a device → pending; no readings access yet; second farmer requesting the same device → 409; manager approves → device appears in the farmer's list, farmer's socket reconnects and live updates arrive; manager rejects → farmer sees Rejected with note and may retry; approving a device already owned elsewhere → 409 and request auto-rejected.
6. **District scoping:** manager A (district X) cannot list, open or read data of farmers in district Y: `GET /api/manager/farmers/:id` → 404 and `/api/readings/latest?deviceId=<Y's device>` → 403; manager without `?deviceId=` → 400; manager A does not receive live events for district Y's devices; manager A cannot approve/reject district Y's requests.
7. **Unmanaged district:** farmer in a district with no manager can register, request devices (pending) and use the app; profile shows "No manager assigned yet"; once a manager is added, they see the farmer and the pending request.
8. **Farmer ↔ manager visibility:** farmer's profile shows the manager's name and a working `tel:` call link; manager sees each farmer's profile and device data read-only; there are no write controls in manager farmer views.
9. **Profiles:** every role can open `/profile` from the header icon, update permitted fields (managers cannot change district/division), and change their password (wrong current password rejected).
10. **Guards:** each role is redirected to its own home from other roles' routes; a farmer with only pending requests lands on `/devices` (no redirect loop); logging out and in as a different role in the same tab shows the correct panel and clears the saved selected device.

---

## Explicitly NOT in Phase 7 (future phases)

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
- **Phase 7 (IN PROGRESS)**: RBAC — farmer / manager / admin, district-based manager, device-request approval, manager and admin panels, profile pages for all roles.