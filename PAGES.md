# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 5 — Pages & Sections — STATUS: IN PROGRESS

Phase 5 is small and mostly backend/pipeline work (six devices, unique device ownership, multi-device MQTT, per-device socket rooms). **There is exactly one frontend-visible page change**: the Link Device page gains one new inline error state. All other pages are unchanged in content and behavior.

### Page: Link Device (`/link-device`) — one change

Everything from Phase 4 stands (fields: Device ID, Device Code; `POST /api/auth/link-device`; success redirects to `/`; no Sidebar/Header; route-guard behavior unchanged).

**New in Phase 5 — "already linked" error state:**
- If the server responds **409** with the message "This device is already linked to another account", show that message inline in the same error area used for other failures. No new component, no layout or styling change.
- Keep what the user typed in the fields (don't clear the form).
- This message can only appear after a correct device code was supplied, so it does not reveal which device IDs exist. The existing generic error for wrong ID/code ("Invalid device ID or code") is unchanged and must still not say which field was wrong.
- A 409 for "you already have a device linked" is still handled as in Phase 4 (such a user is redirected to `/` by the route guard anyway).

Valid device IDs for linking are the six seeded IDs (G3036, G3037, G3038, G3040, G3041, G3042), each with its own code (see `AGENTS.md`). A device already claimed by one account cannot be claimed by another.

---

### Pages unchanged in Phase 5

- **Register (`/register`)** — unchanged.
- **Login (`/login`)** — unchanged.
- **Dashboard (`/`)** — unchanged content. The live readings panel still consumes `useLatestReading`'s same return shape; the only difference is behind the scenes: the server now delivers `new-reading` only to the user's linked device's room, so a user never sees another device's readings.
- **Reading Log (`/history`)** — unchanged.
- **Calendar (`/calendar`)** — unchanged.

### Sidebar (all authenticated pages) — unchanged

Nav links (Dashboard, History, Calendar, Settings still disabled), real `deviceId` from `user.device.deviceId`, logout control.

---

## Route Guard Summary (unchanged — single source of truth for `App.jsx`)

| State | Visiting `/`, `/history`, `/calendar` | Visiting `/link-device` | Visiting `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → redirect `/login` | → redirect `/login` | shown normally |
| Authenticated, no device linked | → redirect `/link-device` | shown normally | → redirect `/` (already logged in) |
| Authenticated, device linked | shown normally | → redirect `/` | → redirect `/` (already logged in) |

---

## Phase 5 Acceptance Checks

1. **Seeding:** `devices` collection contains the six seeded IDs (G3036, G3037, G3038, G3040, G3041, G3042) with their codes.
2. **Unique ownership:** user A links G3037 (success); user B links G3037 with the correct code → 409 "already linked to another account"; user B with a wrong code → generic invalid error; user A trying to link a second device → 409.
3. **Index:** `users` collection has a unique partial index on `device.deviceId`; multiple users with `device: null` still coexist.
4. **MQTT:** `mimic-device/` publishes for all six devices; `mqtt-bridge/` writes each to its own collection; a message for an unseeded device ID is rejected and creates no collection.
5. **Socket isolation:** with two users logged in on different devices, each dashboard updates only from its own device's readings; a socket without a valid JWT is rejected.

---

## Explicitly NOT in Phase 5 (future phases)

- Multiple devices per user / a device switcher
- Unlink / re-link device flow (including releasing a device so another account can claim it)
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
- **Phase 5 (IN PROGRESS)**: Six devices (G3036, G3037, G3038, G3040, G3041, G3042); a device can be linked by only one account (unique index + 409 error on Link Device); multi-device MQTT pipeline; Socket.IO delivery scoped to per-device rooms. Still one device per user.