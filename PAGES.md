# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 6 — Pages & Sections — STATUS: COMPLETE

Phase 6 added **multiple devices per user**. A user can add more devices at any time and switch which device the Dashboard, Reading Log and Calendar show. The visible changes: a **device switcher in the header**, an **"Add device" flow** that reuses the Link Device page, and every data page following the selected device. Everything else is unchanged.

Stages: 6a docs ✅ · 6b backend model + API ✅ · 6c sockets ✅ · 6d-1 frontend data layer ✅ · 6d-2 switcher UI ✅ (see `AGENTS.md`).

### Section: Device switcher (Header — all authenticated pages) — implemented

Replaces the static "Device: G3036" text.

- **Desktop header:** where "Device: <ID>" and the status badge appear, a dropdown button shows the **selected device ID** (monospace) and a chevron. The status badge and "Last updated" stay next to it and always describe the **selected** device.
- **Mobile:** on the Dashboard, the "Device:" label in the sub-bar is followed by the same dropdown. On Reading Log and Calendar the dropdown sits in the mobile top bar (via the Header's `mobileSwitcher` prop).
- **Dropdown contents:**
  1. One row per owned device (device ID; the selected one has a check mark and highlighted background). Clicking a row selects that device and closes the menu.
  2. A divider, then an **"Add device"** row with an `add` icon. Clicking it navigates to `/link-device`.
- With exactly one device the dropdown still opens (that device plus "Add device").
- Closes on outside click and on `Escape`. Keyboard accessible (button + `role="menu"`, Arrow Up/Down, Enter/Space).
- With no selected device it renders "—" and no menu.
- Styling follows `DESIGN.md`: white surface, 1px `border-subtle` outline, 0.5rem radius, soft neutral shadow. No new colors.
- Sidebar: the status dot's tooltip shows the **selected** device ("Device: G3037").

### Behavior: switching devices (Dashboard, Reading Log, Calendar) — implemented

- The selected device is remembered across reloads (`prohori_selected_device` in `localStorage`). If the saved ID is not one of the user's devices, the first device is used.
- Selecting a device immediately reloads the current page's data for that device:
  - **Dashboard (`/`)** — live readings panel, status badge, "Last updated", and the trend chart all switch. The previous device's values never flash: the loading state shows until the new device's reading arrives. Live updates apply only to events whose `device_id` matches the selected device. The 7d/30d range stays as the user left it.
  - **Reading Log (`/history`)** — table reloads and goes back to page 1.
  - **Calendar (`/calendar`)** — month grid reloads; the selected day is cleared. The viewed month stays.
- A device with no readings yet shows the existing empty states — no new states.
- Live updates for **non-selected** devices are ignored by the UI.
- On logout (or an expired session) the saved selection is cleared; a different account logging in within the same tab starts from its own first device.

### Page: Link Device (`/link-device`) — now also "Add device" — implemented

One page, two modes, chosen by whether the user already owns a device. Fields, endpoint (`POST /api/auth/link-device`) and layout (`AuthShell`, no Sidebar/Header) are unchanged.

**First device (user has no devices):**
- Heading "Connect your Prohori device", button "Connect device" ("Connecting device..." while submitting), **no Cancel link**.
- On success, the device becomes selected and the user lands on the Dashboard.

**Add device (user already has one or more devices):**
- Reached from the header switcher's "Add device" row (the route guard lets linked users open this page).
- Heading "Add another device", button "Add device" ("Adding device..." while submitting). The footer keeps the existing helper line about the device ID and code.
- A **Cancel** text link under the button (to `/`) returns to the Dashboard without changes.
- On success: the new device becomes the **selected** device, the live socket is reconnected so it receives that device's readings, and the user lands on the Dashboard showing the new device.

**Inline errors (same error area; typed values are kept, form is not cleared):**
- Wrong ID or code, or nonexistent device → "Invalid device ID or code" (generic; never says which field).
- User already owns this device → "You have already added this device" (409).
- Device belongs to another account → "This device is already linked to another account" (409).
- The two 409 messages only appear after a correct code was supplied, so they do not reveal which device IDs exist.
- The page reads the message from `err.response.data.error.message` (this fixed an earlier bug where every failure showed the generic message).

### Pages unchanged in Phase 6

- **Register (`/register`)** — unchanged, except the post-register redirect uses `user.devices.length > 0`.
- **Login (`/login`)** — unchanged, except the post-login redirect uses `user.devices.length > 0`: with devices → `/`, without → `/link-device`.

### Sidebar (all authenticated pages)

Nav links unchanged (Dashboard, History, Calendar, Settings still disabled), logout control unchanged. Only the device status dot's tooltip changes (selected device ID). Logout also clears the saved selected device and disconnects the socket.

---

## Route Guard Summary (single source of truth for `App.jsx`)

| State | Visiting `/`, `/history`, `/calendar` | Visiting `/link-device` | Visiting `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → redirect `/login` | → redirect `/login` | shown normally |
| Authenticated, no device | → redirect `/link-device` | shown normally (first device, no Cancel) | → redirect `/` (already logged in) |
| Authenticated, one or more devices | shown normally | shown normally (Add device, with Cancel) | → redirect `/` (already logged in) |

---

## Phase 6 Acceptance Checks

1. **Migration:** `migrateDevices.js` converts existing users to a `devices` array (users with none get `[]`); re-running changes nothing. After `seedDevices.js`, the old `device.deviceId` index is gone and the unique partial index on `devices.deviceId` exists. ✅
2. **Add devices:** a user already on one device adds more; the header dropdown lists all of them and the newly added one is selected after each add. ✅
3. **Switching:** switching in the dropdown changes the Dashboard cards, trend chart, Reading Log table and Calendar data to that device. Reload keeps the selected device. No stale values flash on switch. ✅
4. **Ownership rules:** another account adding a taken device with the correct code → 409 "This device is already linked to another account"; with a wrong code → generic invalid error. Re-adding an owned device → 409 "You have already added this device". Concurrent adds of the same device by two accounts → only one succeeds. ✅
5. **Device scoping on the API:** `GET /api/readings/latest?deviceId=<not owned>` → 403; without `deviceId` → data for the first device; a user with no devices → 403 "No device linked". ✅
6. **Live updates:** with `mimic-device/` running, the live panel updates only from the selected device; switching starts updating from the new one without a refresh; a different account never sees these readings; a just-added device updates live immediately (socket reconnected). ✅
7. **Sockets:** a socket with no token, a garbage token, or a user with no devices is rejected; a user with N devices is in exactly N rooms; an already-open socket does not receive a newly added device until it reconnects. ✅
8. **Guards:** a linked user can open `/link-device` (with Cancel); an unlinked user is redirected there from every other authenticated page and sees no Cancel link; logging out and logging in as another account in the same tab shows that account's devices and clears the old selection. ✅

---

## Explicitly NOT in Phase 6 (future phases)

- Unlink / re-link device flow (including releasing a device so another account can claim it)
- Device nicknames / renaming
- A limit on devices per account
- Password reset or email verification
- Push/email/SMS notifications
- Settings/configuration page
- Role-based access (admin vs regular user)
- OAuth / third-party login
- Export/download data feature

---

## Phase History

- **Phase 1**: Single dashboard page — header/status, polling-based current readings panel with threshold alert indicators, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.
- **Phase 3 (COMPLETE)**: Replaced the direct-to-Mongo simulator with a real MQTT pipeline. `mimic-device/` publishes to the real broker, `mqtt-bridge/` is the sole writer to the device collections. Verified end-to-end including live Socket.IO delivery.
- **Phase 4 (COMPLETE)**: Authentication (Register/Login) and Link Device page gating dashboard access; route guards; data scoped to the user's linked device; one device per user.
- **Phase 5 (COMPLETE)**: Six devices (G3036, G3037, G3038, G3040, G3041, G3042); a device can be linked by only one account (unique index + 409 error on Link Device); multi-device MQTT pipeline; Socket.IO delivery scoped to per-device rooms. One device per user.
- **Phase 6 (COMPLETE)**: Multiple devices per user — header device switcher, "Add device" via the Link Device page (with Cancel), all data pages follow the selected device, multi-room sockets. Unlink remains out of scope.