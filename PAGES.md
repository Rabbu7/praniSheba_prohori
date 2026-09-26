# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 4 — Pages & Sections — STATUS: IN PROGRESS

Phase 4 adds three new pages in front of the existing dashboard: Register, Login, and Link Device. The three existing routed pages (Dashboard, Reading Log, Calendar) are otherwise unchanged in *content* — the only change to them is that they now sit behind auth + device-link route guards, and their data is scoped to whichever device the logged-in user has linked.

### Page: Register (`/register`)

- Fields: username, email, password (and a confirm-password field, client-side only — not sent to the API).
- On submit: `POST /api/auth/register`. On success, behave like a successful login — store the returned JWT, then follow the same "does this user have a linked device" redirect logic as Login (below). A brand-new registration always has no device yet, so in practice this always lands on `/link-device`.
- On failure (duplicate email/username, validation error): show the error inline near the relevant field, don't clear what the user typed.
- Link to `/login` for existing users ("Already have an account? Log in").
- No Sidebar/Header on this page — it's outside the authenticated shell.

### Page: Login (`/login`)

- Fields: email, password.
- On submit: `POST /api/auth/login`. On success, store the JWT, then call `GET /api/auth/me`:
  - `device` present → redirect to `/` (Dashboard)
  - `device` absent/null → redirect to `/link-device`
- On failure (wrong credentials): show a generic "invalid email or password" error — don't reveal which field was wrong.
- Link to `/register` for new users ("Don't have an account? Register").
- No Sidebar/Header on this page.
- This is also where an unauthenticated user gets redirected if they try to visit any protected route directly.

### Page: Link Device (`/link-device`)

- Fields: Device ID, Device Code.
- On submit: `POST /api/auth/link-device`. On success, redirect to `/` (Dashboard), which now loads data scoped to the newly-linked device.
- On failure (device ID/code mismatch, or device ID doesn't exist): show an inline error — don't say which of the two fields was wrong, to avoid leaking valid device IDs by trial and error.
- **This page is reachable by any authenticated user with no linked device, every time** — not just right after registration. If such a user logs in again later (e.g. closes the tab mid-onboarding, comes back next day), they land here again before ever seeing a dashboard. This is enforced by the route guard checking `me`'s `device` field on every load, not by a one-time "just registered" flag.
- A user who already has a device linked should not be able to navigate back to this page to change it — Phase 4 has no "unlink" or "re-link" flow. Attempting to visit `/link-device` with a device already linked redirects to `/`.
- No Sidebar/Header on this page (device isn't known yet, so the normal shell — which shows device ID/status — doesn't make sense here).

---

### Page: Dashboard (`/`) — unchanged content, now auth + device-guarded

Everything from Phase 3 stands as-is (header, real-time readings panel, daily-average chart). The only Phase 4 change: the page is wrapped in a route guard that requires both authentication and a linked device, and all its data calls are now implicitly scoped server-side to `req.user.device.deviceId` — no frontend changes to *what* is fetched, just that the server resolves *which* device's data comes back.

### Page: Reading Log (`/history`) — unchanged content, now auth + device-guarded

Same as above — no content changes, same route-guard wrapping.

### Page: Calendar (`/calendar`) — unchanged content, now auth + device-guarded

Same as above — no content changes, same route-guard wrapping.

---

### Sidebar (all authenticated pages)

- Unchanged nav links (Dashboard, History, Calendar, Settings still disabled).
- **New**: a logout control (icon or link at the bottom of the sidebar, near the device status indicator). Logging out clears the stored JWT and redirects to `/login`.
- Sidebar is not shown on Login, Register, or Link Device pages — only once a user is inside the authenticated shell with a linked device.

---

## Route Guard Summary (for the coding agent — exact behavior to implement)

| State | Visiting `/`, `/history`, `/calendar` | Visiting `/link-device` | Visiting `/login`, `/register` |
|---|---|---|---|
| Not authenticated | → redirect `/login` | → redirect `/login` | shown normally |
| Authenticated, no device linked | → redirect `/link-device` | shown normally | → redirect `/` (already logged in) |
| Authenticated, device linked | shown normally | → redirect `/` | → redirect `/` (already logged in) |

This table is the single source of truth for `App.jsx`'s routing logic — implement exactly this, no additional states.

---

## Explicitly NOT in Phase 4 (future phases)

- Multiple devices per user / a device switcher (Phase 5)
- Unlink / re-link device flow
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
- **Phase 3 (COMPLETE)**: Replaced the direct-to-Mongo simulator with a real MQTT pipeline. `mimic-device/` publishes to the real broker, `mqtt-bridge/` is the sole writer to `G3036`. Verified end-to-end including live Socket.IO delivery to the dashboard.
- **Phase 4 (IN PROGRESS)**: Authentication (Register/Login) and a Link Device page gating dashboard access. A user with no linked device always lands on Link Device, on every login, until they successfully link one. Dashboard, History, and Calendar pages are content-unchanged but now sit behind auth + device-link route guards and are scoped to the logged-in user's linked device. One device per user in this phase — multi-device deferred to Phase 5.