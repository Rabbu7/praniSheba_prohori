# PAGES.md

> Defines the screens/pages/sections that exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Current Phase: Phase 12 — Dark Mode and Settings — STATUS: COMPLETE

Phase 12 introduces comprehensive dark theme support across the entire interface and an accessible client-side Settings page (`/settings`) for all user roles, strictly adhering to `DESIGN.md`.

### Settings View (`/settings`)
- Accessible to all roles (`farmer`, `manager`, `admin`) wrapped under `ProfileGuard`.
- Uses the standard `Sidebar` and `Header` shell (`title={t('nav.settings')}`, `showDevice={false}`).
- **Layout:** Responsive 2-column grid (`grid grid-cols-1 lg:grid-cols-12 gap-6 pb-24 md:pb-8`).
  - **Left Column (`lg:col-span-8`):**
    - **Appearance:** Theme segmented control (Light / Dark / System), Text size segmented control (Normal / Large), Reduce motion accessible switch row.
    - **Language:** English / বাংলা segmented control.
    - **Threshold Guide:** Live environmental threshold guide populated from `GET /api/meta/thresholds` via `useThresholds`, detailing Safe, Warning, and Danger bands for Ammonia, Methane, Humidity, and Temperature with Latin digits and localized units.
  - **Right Column (`lg:col-span-4`):**
    - **Account:** Overview card with link navigating to `/profile`.
    - **About:** Platform title, semantic version (`__APP_VERSION__`, e.g. `1.0.0` in `font-mono`), and for farmers, manager contact details with direct `tel:` call link (or `profile.noManagerAssigned`).
    - **Reset Preferences:** Reset action with `ConfirmDialog` restoring theme, text size, motion, language, and selected device without clearing auth credentials.
- **Header & Navigation Entry Points:**
  - Desktop Sidebar contains an enabled `Settings` item for all roles (desktop-only; hidden on mobile bottom bar).
  - Mobile Header features a settings gear icon leading directly to `/settings`.
  - Desktop Header and `AuthShell` feature a quick `ThemeToggle` button switching between light and dark themes.

### Phase 12 Acceptance Checks
1. `oxlint` has 0 errors, `vite build` succeeds, and `npm run i18n:check` passes with 0 missing keys and 0 unused-key warnings.
2. **Matrix:** Every route (`/login`, `/register`, `/complete-profile`, `/change-password`, `/`, `/history`, `/calendar`, `/devices`, `/profile`, `/messages`, `/settings`, `/manager`, `/manager/farmers`, `/manager/farmers/:id`, `/manager/farmers/:id/devices/:deviceId`, `/manager/requests`, `/manager/messages`, `/admin`, `/admin/managers`) in light and dark, EN and BN, desktop and 360px. Text, placeholders, and disabled states are readable, with no invisible borders and no overflow.
3. **Theme:** Dark persists across reload with no flash of the wrong theme. System follows the OS and updates live. The `ThemeToggle` in the desktop header and `AuthShell` stays in sync with the Settings selector.
4. **Text size:** Large works on every route, including 360px, with no overflow, no clipped bottom-nav labels (EN and BN) and dialogs that still fit and scroll.
5. **Reduce motion:** ON stops all pulse, flash, and hover animations, the chart does not animate, and chat scrolling is instant. OFF brings them back. When nothing is stored, it follows the OS.
6. **Threshold guide:** Matches `GET /api/meta/thresholds` for all four metrics. Latin digits with separators in BN too (`12,500`, `1,000`). Humidity and temperature show both low and high bands.
7. **About:** Version shows 1.0.0. A farmer with a manager sees the name and a working `tel:` link. A farmer without a manager sees the "no manager" note. Managers and admins see no contact row.
8. **Reset:** Confirm dialog appears. After confirming: theme is System, text size is Normal, motion follows the OS, language is back to the default, and the selected device is cleared. The user stays logged in (token intact). Cancel changes nothing.
9. **Guards:** `/settings` behaves like `/profile` for every state. A farmer with no devices can open it.
10. **Entry points:** The Settings item is in the desktop Sidebar for all roles. The mobile bottom bar is unchanged. The mobile gear is present for all roles. The 360px header fits in EN and BN.
11. **Regression:** Device request dialog, notification bell, messaging send/receive, CSV export dialog, and manager approve/reject work without regression.
12. **No scope creep:** No changes under `server/`, `mqtt-bridge/`, or `mimic-device/`. No new color token names. The final grep shows no hardcoded hex or palette classes outside allowed exceptions.
13. **Design compliance:** The new screens use only existing tokens, with no inline hex values and no new colors. They match DESIGN.md for typography, radius, elevation, and layout on desktop and at 360px, in EN and BN, in both themes.

## Previous Phase: Phase 11 — Farmer ↔ Manager Messaging (COMPLETE)

Phase 11 introduces direct, real-time 1-on-1 messaging between farmers and their assigned district manager, strictly adhering to `DESIGN.md` design tokens, responsive typography, and bilingual rules.

### Entry Points & Header Badge
- **Header Chat Action:** A `chat` icon button with unread count badge (using `bg-status-danger text-on-primary rounded-full`) sits adjacent to the notification bell in `Header.jsx` for both farmers and managers (across both desktop and mobile viewports).
  - Unread badge shows count up to `9+`, matching the notification bell pattern.
  - Clicking navigates to `/messages` for farmers, and `/manager/messages` for managers.
  - Live count updates in real time via socket `new-message` events and periodic re-validation.
- **Profile & Detail Shortcuts:**
  - Farmers see a prominent **"Message manager"** (`messages.messageManager`) action button in `ManagerCard.jsx` on `/profile`.
  - Managers see a **"Message farmer"** (`messages.messageFarmer`) action button in `FarmerDetail.jsx` on `/manager/farmers/:farmerId`.

### Farmer Messaging View (`/messages`)
- Direct 1-on-1 thread with the active district manager (derived dynamically from `farmer.district`).
- **Layout & Shell:** Hybrid Sidebar-Canvas layout with standard `Sidebar` and `Header` shell (`title={t('messages.title')}`, `showDevice={false}`).
- **Active Thread State:**
  - Thread header displays the assigned manager's name, role subtitle, and a working direct `tel:` call link.
  - Message bubble stream rendered in chronological order. Own messages display on the right (`bg-primary text-on-primary rounded-lg shadow-xs`), while manager messages display on the left (`bg-surface-container-low border border-border-subtle text-on-background rounded-lg shadow-xs`).
  - Text is strictly escaped plain text (1–1,000 characters). Timestamps formatted in Asia/Dhaka time with Latin numerals.
  - Auto-scrolls smoothly to the newest message on initial load and upon incoming messages; preserves scroll position when loading older messages.
  - Older messages loaded in batches of 30 via cursor pagination (`before=<oldestId>`).
- **Unassigned District State:**
  - When the farmer's district has no active manager appointed, the message composer is replaced by an informational card (`messages.noManagerTitle` & `messages.noManagerDesc`) with an `info` icon. Sending is prevented (and backed by server 409 `NO_MANAGER_ASSIGNED`).
- **Mobile Viewport (360px):**
  - Page container has `pb-24` padding so the message composer sits comfortably above the sticky bottom navigation bar without overlapping.

### Manager Messaging View (`/manager/messages` & `/manager/messages/:farmerId`)
- Responsive master-detail layout allowing district managers to oversee conversations with all active farmers in their district.
- **Desktop (2-Column Master-Detail):**
  - **Left Pane (Conversation List):**
    - Search input (`messages.searchFarmers`) filtering farmers by first name, last name, or phone number.
    - Each conversation item displays farmer initials avatar, full name, relative timestamp of latest message, message body preview, and an unread badge if there are unread messages.
    - Active conversation highlighted with `bg-primary/5 border-l-4 border-l-primary`.
    - Real-time updates bump the latest message to the top and increment unread count for unselected conversations.
  - **Right Pane (Active Thread):**
    - If a farmer is selected (`/manager/messages/:farmerId`), renders `ChatThread` with farmer's name, phone, and district in header.
    - If no farmer is selected (`/manager/messages`), renders an empty state illustration with `messages.conversations` and `messages.selectConversation`.
- **Mobile Viewport (360px):**
  - Responsive single-pane toggle:
    - At `/manager/messages`: Displays the conversation list.
    - At `/manager/messages/:farmerId`: Automatically hides the conversation list and shows the active chat thread with a back button (`arrow_back` with `aria-label={t('messages.backToConversations')}`) returning to `/manager/messages`.

### Realtime Delivery & Security
- Isolated rooms: Socket room `user:<userId>` delivers `new-message` events only to the sender and recipient.
- Message data is never broadcast through IoT device rooms or `io.emit`.
- Zero-device socket connections: Farmers and managers with 0 devices can establish socket connections to receive messaging events, while admins remain rejected (401).
- Unread auto-clearing: Opening a thread or receiving a message while in the open thread automatically issues a mark-read call and dispatches `prohori:messages-read` to synchronize header badges across open tabs.

### Phase 11 Acceptance Checks (all passed)
1. **Thread isolation:** Each farmer has exactly one conversation thread with the active manager of their district. No cross-district visibility.
2. **Dynamic manager derivation:** No `managerId` stored on messages. A newly appointed manager automatically accesses the existing message history of their district's farmers.
3. **RBAC & Admin prohibition:** Admins cannot access messaging endpoints (403 `FORBIDDEN`) and cannot open socket connections.
4. **Validation & Sanitation:** Messages must be 1–1,000 characters after trim. Escaped plain text only; never rendered as HTML.
5. **No manager handling:** A farmer in an unmanaged district cannot send messages (server returns 409 `NO_MANAGER_ASSIGNED`, client shows informative disabled composer banner).
6. **Realtime delivery:** Live messages sent over socket reach only the intended `user:<userId>` rooms and instantly appear in open threads without page reload.
7. **Read states:** Reading messages marks `readAt` timestamp. Unread badges in header and conversation list update in real time.
8. **Rate limiting:** `messageLimiter` limits message creation to 30 requests/minute per user (429 `RATE_LIMITED`).
9. **Responsive 360px UI:** Chat composer and thread are fully usable at 360px mobile width with `pb-24` clearance above the bottom navigation bar.
10. **Design System & Localization:** Strictly adheres to `DESIGN.md` tokens (no inline hex, `Noto Sans Bengali` overrides, Latin numerals for timestamps, 362 keys each in EN/BN with 0 errors).

---

## Previous Phase: Phase 10 — Localization (English & Bangla) — STATUS: COMPLETE

Phase 10 implements bilingual support across the entire interface without adding external i18n libraries, new colors, or schema changes.

### Language Toggle (`LanguageToggle`)

- Pill toggle button with options: `EN | বাং`.
- Visible in:
  - Desktop `Header`: placed next to the Notification Bell and User Profile button.
  - Mobile `Header`: inside the header bar alongside mobile actions.
  - `AuthShell`: top-right corner of unauthenticated and forced-change screens (`/login`, `/register`, `/complete-profile`, `/change-password`).
- Clicking toggles between English (`en`) and Bangla (`bn`).
- Preference stored in `localStorage` under `prohori_lang`. Instant re-render via `LanguageContext`.

### Typography & Numerals

- Font family: `Noto Sans Bengali` fallback configured in `--font-sans` and `body` in `index.css`.
- `html[lang='bn']` overrides: disables letter-spacing/tracking and uppercase transformations that break Bengali conjuncts; line-height set to `1.5` to prevent diacritic clipping.
- Sensor reading numbers, chart axis tick numbers, calendar min/max cell values, and measurement units (`ppm`, `%`, `°F`) stay in Latin digits across both languages for readability and IoT consistency.
- Metric labels, zone badges, navigation tabs, button text, table headers, status pills, and notifications are translated.

### Domain Terminology

- **Metrics:** Ammonia (`অ্যামোনিয়া`), Methane (`মিথেন`), Humidity (`আর্দ্রতা`), Temperature (`তাপমাত্রা`).
- **Zones / Alerts:** Safe (`নিরাপদ`), Warning (`সতর্কতা`), Danger (`বিপদ`).
- **Device Status:** Approved (`অনুমোদিত`), Pending (`অপেক্ষমান`), Rejected (`প্রত্যাখ্যাত`), Unlinked (`সংযোগ বিচ্ছিন্ন`).

### Localized Date & Relative Time

- Dates formatted according to active language (`en-US` vs `bn-BD-u-nu-latn`) while preserving UTC+6 `Asia/Dhaka` timezone.
- Relative times handled via standard `Intl.RelativeTimeFormat` with `numeric: 'auto'` and Latin numerals.

### Localized Error Handling & Locations

- Server errors matching `error.code` are mapped to localized strings via `translateError(err, fallbackKey)` with network offline detection fallback.
- Location dropdowns and displays show Bangla division/district names while submitting canonical English strings to the backend.
- System-generated device request notes ("Already added", "Already linked to another account") are mapped to localized copy.

### Phase 10 Acceptance Checks (all passed)

1. **Language toggle:** Toggle is accessible in Header (desktop/mobile) and AuthShell; toggling switches all visible text instantly. (PASS)
2. **Persistence:** Selected language persists in `localStorage` key `prohori_lang` across reloads and auth states (auto-detects `navigator.language` on first visit). (PASS)
3. **Typography & layout:** `Noto Sans Bengali` renders cleanly with `html[lang='bn']` typography overrides without layout shifts or text overflow. (PASS)
4. **Auth flows:** Login, Register, Complete Profile, and Change Password are fully bilingual with zero hardcoded English text. (PASS)
5. **Farmer dashboard & views:** Dashboard metrics, chart tabs/tooltips, Reading Log table/modal, Calendar grid/cards, and My Devices dialog/actions are completely translated. (PASS)
6. **Manager panel:** Overview cards, Farmers table, Farmer detail, Device view tabs, and Requests table/actions are completely translated. (PASS)
7. **Admin panel:** Overview statistics, Managers table headers, Add Manager modal, Reset Password modal, and status filters are completely translated. (PASS)
8. **Locations & Errors:** Location selects display Bangla options and submit canonical English values; complete server error code dictionary coverage with network fallback. (PASS)
9. **Numerals & units:** Readings, min/max values, chart ticks, and physical units (`ppm`, `%`, `°F`) remain in Latin digits across both languages. (PASS)
10. **Build & Automated Guard:** `oxlint` reports 0 errors, `vite build` succeeds, and `npm run i18n:check` passes with 0 missing keys. (PASS)
11. **Phase 10k Localization & 360px Mobile QA Matrix:** Full verification across all 17 routes in desktop and 360px mobile viewports for both English and Bangla. (PASS)
12. **Phase 10l Final Localization Fixes:** `check-i18n.mjs` enhanced with robust last-argument regex covering `createError`, `respondError`, and `createAuthError` (44 server codes audited), `LOCATIONS` coverage check (8 divisions, 64 districts), dynamic key sets validation, and identical-value guard. Mobile bottom bar streamlined (disabled Settings and device dot removed, full labels restored) and verified at 360px; Bangla dialog titles verified in short question form. (PASS)
13. **Phase 10m Dead-Key Cleanup:** Removed 62 dead keys from both dictionaries. `common.justNow` wired into `dateFormatter.js` and all callers; `admin.managerCreatedSuccess` displayed as success banner on manager creation. Dictionaries now contain exactly 341 keys each with 0 errors and 0 unused key warnings. (PASS)

### Phase 10k — Mobile 360px & Localization QA Matrix

Comprehensive responsive verification matrix conducted across all pages, viewports (Desktop & 360px mobile), and language locales (`en` and `bn`). Special emphasis placed on Bangla 360px mobile rendering: bottom-nav label overflow prevention, table-header letter-spacing and line-height normalization, truncation safety, and Latin digit rule enforcement.

| Section | Route | Desktop (EN) | Desktop (BN) | Mobile 360px (EN) | Mobile 360px (BN) | Notes / Verified Behaviors |
|---|---|:---:|:---:|:---:|:---:|---|
| **Auth** | `/login` | PASS | PASS | PASS | PASS | Full translation, clean inputs, no overflow |
| **Auth** | `/register` | PASS | PASS | PASS | PASS | Cascading location selects in BN, localized validation |
| **Auth** | `/complete-profile` | PASS | PASS | PASS | PASS | Responsive form layout, localized error banner |
| **Auth** | `/change-password` | PASS | PASS | PASS | PASS | Responsive card, client-side same-password rejection |
| **Farmer** | `/` (Dashboard) | PASS | PASS | PASS | PASS | Sensor cards, 7d/30d tabs, chart tooltip, Latin units |
| **Farmer** | `/log` (Reading Log) | PASS | PASS | PASS | PASS | Responsive table, CSV export, table header line-height |
| **Farmer** | `/calendar` | PASS | PASS | PASS | PASS | Intl weekdays, localized day detail cards, Latin min/max |
| **Farmer** | `/devices` | PASS | PASS | PASS | PASS | Device card grid, Request dialog, format hint placeholder |
| **Farmer** | `/profile` | PASS | PASS | PASS | PASS | Manager info block, telephone action, password change |
| **Manager** | `/manager` (Overview) | PASS | PASS | PASS | PASS | Metric summary cards, direct quick links |
| **Manager** | `/manager/farmers` | PASS | PASS | PASS | PASS | District farmer list, table headers normalized in BN |
| **Manager** | `/manager/farmers/:id` | PASS | PASS | PASS | PASS | Full-sentence parameterized unlink dialog, device table |
| **Manager** | `/manager/farmers/:id/devices/:devId` | PASS | PASS | PASS | PASS | Farmer device inspection, tabbed history/calendar |
| **Manager** | `/manager/requests` | PASS | PASS | PASS | PASS | Status filter tabs, approval/rejection full dialogs |
| **Admin** | `/admin` (Overview) | PASS | PASS | PASS | PASS | Platform metrics, unmanaged district counter |
| **Admin** | `/admin/managers` | PASS | PASS | PASS | PASS | Full-sentence delete/restore dialogs, responsive table |
| **Admin** | `/profile` | PASS | PASS | PASS | PASS | Responsive profile view, password update |

---

## Phase 9 — Pages & Sections — STATUS: COMPLETE

Phase 9 adds security hardening, reliability states, and account/device management controls using existing `DESIGN.md` tokens and **no new colors**. No deployment or Phase 10 localization work yet.

### Forced password change (`/change-password`, managers)

- Shown when an admin-created or admin-reset manager logs in with `mustChangePassword: true`.
- Uses `AuthShell` (no Sidebar/Header) and reuses `PasswordForm`.
- Route guard redirects any authenticated user with `mustChangePassword: true` to `/change-password` until updated, then sends them to their role home (`/manager`).

### Reliability & Error States

- Global React `ErrorBoundary` catching unexpected render errors with a clean fallback, **Reload page**, and **Go to home** buttons.
- One consistent "server unreachable" state (`ServerUnreachable`) across data-fetching pages, shown only on network errors or 5xx responses.
- Empty readings state: `404 NO_READINGS_FOUND` from `/api/readings/latest` renders the Dashboard normally with `—` sensor cards and an inline `"No readings received yet"` note in the readings panel.

### Notification bell (manager navigation update)

- Clicking a row in the manager's notification bell navigates directly to `/manager/farmers/:farmerId/devices/:deviceId` (using `farmerId` on the serialized alert) instead of `/manager/farmers`.

### Device nicknames & Unlink device

- Optional `nickname` on a farmer's linked device, displayed alongside the monospace `deviceId` in `DeviceSwitcher`, farmer My Devices, and manager tables.
- Unlink device action (manager within their district via UI; admin unlink `DELETE /api/admin/farmers/:farmerId/devices/:deviceId` is API-only for now): confirms and removes the device from the farmer's account, marks that farmer's `approved` request(s) for that device as `unlinked` (shown with a neutral **Unlinked** pill in My Devices, with no Open dashboard or edit-nickname actions), resolves open alerts for that device, resets the alert engine state for that device, and makes the device requestable again.

### Admin Managers (Restore & Password Reset)

- Admin Managers view supports restoring a removed manager (subject to the one-active-manager-per-district rule) and resetting a manager's password to a temporary password (sets `mustChangePassword: true`).

### Reading Log CSV Export

- One **Export CSV** button on the Reading Log page (farmer `/history` and manager device view) with a required date range and server-enforced row cap.

### Phase 9 Acceptance Checks (all passed)

1. **Phase 7 & Phase 8 regression:** registration validation & forced `farmer` role, unmanaged district visibility, admin/manager district isolation, device request 409 conflicts, alert engine 2-reading debounce, per-user alert read state, and `/api/meta/thresholds` all passed.
2. **Security hardening (9b):** `helmet` headers present, 100 KB JSON body limit returns `413 PAYLOAD_TOO_LARGE`, forced first-login password change blocks manager routes with `403 PASSWORD_CHANGE_REQUIRED` until changed, and socket revalidation drops an open socket when a manager is soft-deleted.
3. **Cleanup (9c) & Reliability (9d):** `/health` reports `200 { status: 'ok', db: 'connected' }`, all server errors include stable `error.code` values, structured logger redacts `password`/`token`/secrets, and `serializeAlert` includes `farmerId` for direct manager bell navigation.
4. **Account & device management (9e):** device nicknames (`PATCH /api/profile/devices/:deviceId`), manager/admin device unlink (`DELETE /api/manager/farmers/:farmerId/devices/:deviceId` & `DELETE /api/admin/farmers/:farmerId/devices/:deviceId` with open-alert resolution and re-requestability), removed-manager restore (`POST /api/admin/managers/:id/restore`), admin manager password reset (`POST /api/admin/managers/:id/reset-password` setting `mustChangePassword: true`), and `resolveDevice`-scoped CSV export (`GET /api/readings/export`) all passed.
5. **Client build & lint:** `oxlint` passed with 0 errors and `vite build` succeeded.

### Phase 9g Acceptance Checks (all passed)

1. **Nickname save:** `PATCH /api/profile/devices/:deviceId` saves and returns the updated nickname; `Devices.jsx` uses `setUser(updatedUser)` with no error.
2. **Unlink request status:** after unlink, `GET /api/device-requests/mine` shows the request as `unlinked` (rendered with the neutral `Unlinked` pill and `—` action), and a new request for that device succeeds (`201`).
3. **Empty readings state:** a device with zero readings returns `404 NO_READINGS_FOUND`; `DashboardView` renders the empty `"No readings received yet"` state instead of `ServerUnreachable`.
4. **Stale device recovery:** after unlink, a failing readings call returns `403` (`NO_DEVICE_LINKED` / `DEVICE_NOT_FOUND`), triggering `refreshUser()` once in `useLatestReading`.
5. **CSV export CORS & errors:** `Access-Control-Expose-Headers` exposes `X-Export-Truncated`, `X-Export-Row-Cap`, and `Content-Disposition`; failed export returns JSON `{ error: { message } }` parsed from the Blob in `HistoryView.jsx`.
6. **Query operator rejection:** `?deviceId[$ne]=x`, `?status[$gt]=`, and `?limit[]=1` all return `400 INVALID_QUERY_PARAMETERS` on `/api/readings/*`, `/api/alerts`, `/api/manager/device-requests`, and `/api/admin/managers`.
7. **Alert engine reset on unlink:** unlinking a device in `danger` calls `engine.forget(deviceId)` so re-linking to a new farmer opens a new alert after 2 danger readings.
8. **Login rate limit:** 3 successful logins do not count toward the limit (`skipSuccessfulRequests: true`), 10 failed logins return `401`, and the 11th failed login returns `429 RATE_LIMITED`.
9. **Password unchanged:** changing the password to the same value returns `400 PASSWORD_UNCHANGED` (`"New password must be different from the current password"`), matching `PasswordForm.jsx`.
10. **Client lint & build:** `oxlint` passed with 0 errors (3 pre-existing warnings) and `vite build` succeeded.

---

## Phase 8 — Pages & Sections — STATUS: COMPLETE

Phase 8 added no new routes. Existing pages gained the items below, using the same tokens and no new colors. No Phase 9 pages are defined yet.

### Notification bell (Header, farmer and manager)

- Replaces the inert bell icon in both the desktop and mobile headers. Admin keeps the inert icon and makes no alert requests.
- Unread count badge: hidden at 0, shows the number, "9+" above 9.
- Click opens a dropdown (max 10 recent alerts). Each row shows a zone dot (amber warning / red danger), "<Metric> <zone>", the device ID (monospace), the value with its unit, relative time, and a "Resolved" tag when `resolvedAt` is set. Unread rows are emphasized.
- Footer: "Mark all as read" (disabled at 0 unread). States: "Loading...", "Unable to load alerts", "No alerts yet."
- Clicking a row marks it read and closes the menu. Farmers go to `/` with that device selected; managers go to `/manager/farmers`.
- Keyboard: arrows move between rows, Escape closes and returns focus to the button, outside click closes (same pattern as the DeviceSwitcher).
- Live: new alerts arrive over the socket and update the badge without reload. Elsewhere (and for managers outside the farmer device view) the bell refetches every 60 s and on tab focus.
- Read state is per user: a manager reading an alert does not mark it read for the farmer.

### Dashboard trend chart (farmer Dashboard and manager device view)

- Metric selector above the chart: Ammonia (default), Methane, Humidity, Temperature. One metric is plotted at a time.
- Threshold bands (safe / warning / danger) are drawn behind the line from `GET /api/meta/thresholds`. Humidity and temperature show two-sided bands. Methane shows safe, warning (1,000–12,500) and danger (above 12,500) bands.
- A small zone key (Safe / Warning / Danger) replaces the old legend. If thresholds fail to load, the chart renders without bands.
- Dates on the X axis are Asia/Dhaka days.

### Calendar, Day detail, Reading Log

- All dates are Asia/Dhaka days. The calendar opens on the current Dhaka month and marks today's Dhaka date.

---

## Phase 8 Acceptance Checks (all passed)

1. **Time windows:** 7d/30d averages use real date windows that start at a full Dhaka day. A reading at 23:30 UTC lands on the next Dhaka day.
2. **Alert creation:** a metric crossing into warning/danger creates exactly one alert; a single flapping reading creates none.
3. **Resolution:** returning to safe resolves the alert. Escalating warning→danger gives one resolved warning and one open danger.
4. **Restart:** a server restart creates no duplicate or phantom alerts and resolves stale open ones.
5. **Scoping:** a farmer sees only their devices' alerts and a manager only their district's. A manager in another district gets 404 on those alert IDs, and an admin gets 403.
6. **Per-user read state:** marking read affects only the current user; the farmer's badge stays unread when the manager reads it.
7. **Live delivery:** a live alert reaches only the right room and updates the badge without a reload.
8. **Chart:** the metric switch and threshold bands render for all four metrics.

---

## Previous Phase: Phase 7 — Pages & Sections — STATUS: COMPLETE

Phase 7 added **role-based access**: `farmer` (existing site, extended), `manager` (new panel) and `admin` (new panel). All pages follow `DESIGN.md` tokens (same Sidebar/Header layout, cards, tables, status pills). No new colors. Phase 8 (alerts, bell, chart upgrade) is documented above.

### Roles at a glance

| Role | Home | Sidebar items |
|---|---|---|
| Farmer | `/` | Dashboard, History, Calendar, My Devices, Profile, Settings (desktop) |
| Manager | `/manager` | Overview, Farmers, Requests, Profile, Settings (desktop) |
| Admin | `/admin` | Overview, Managers, Profile, Settings (desktop) |

Mobile uses the bottom navigation with the same items per role (short labels). The header's `account_circle` icon links to `/profile` for every role. Manager and admin headers hide the device label, switcher, status badge and last-updated chip.

---

## Shared pages

### Page: Register (`/register`)

Farmers only.
- Fields: **First name**, **Last name**, **Email address**, **Division** (dropdown), **District** (dropdown, filtered by the division and disabled until a division is chosen; changing the division clears the district), **Password**, **Confirm password**.
- Division/District options come from `GET /api/meta/locations`.
- Inline validation (all fields required; passwords must match; password at least 8 characters). Server errors (e.g. "Email already in use") are translated via `translateError(err, 'errors.REQUEST_ERROR')` using `error.code` against the active locale.
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

Selected-device switching, live updates filtered by `device_id`, 7d/30d range (real Asia/Dhaka date windows), pagination, calendar min/max. The page bodies are shared view components (`DashboardView`, `HistoryView`, `CalendarView`) that take a `deviceId`. The **DeviceSwitcher** lists only **approved** devices. Its last row, **"Request device"**, opens the request dialog on `/devices`. Farmers with no approved device are redirected to `/devices`.

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

| State | Farmer pages `/`, `/history`, `/calendar` | `/devices`, `/profile`, `/messages`, `/settings` | `/complete-profile` | `/change-password` | `/manager/*` | `/admin/*` | `/login`, `/register` |
|---|---|---|---|---|---|---|---|
| Not authenticated | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | → `/login` | shown |
| Authenticated, `mustChangePassword` | → `/change-password` | → `/change-password` | → `/change-password` | shown | → `/change-password` | → `/change-password` | → `/change-password` |
| Farmer, profile incomplete | → `/complete-profile` | → `/complete-profile` | shown | → `/` | → `/` | → `/` | → `/` |
| Farmer, complete, no approved device | → `/devices` | shown | → `/` | → `/` | → `/` | → `/` | → `/` |
| Farmer, complete, ≥1 approved device | shown | shown | → `/` | → `/` | → `/` | → `/` | → `/` |
| Manager | → `/manager` | `/profile`, `/settings` shown; `/messages` → `/manager/messages`; others → `/manager` | → `/manager` | → `/manager` | shown | → `/manager` | → `/manager` |
| Admin | → `/admin` | `/profile`, `/settings` shown; others → `/admin` | → `/admin` | → `/admin` | → `/admin` | shown | → `/admin` |

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

- Multiple managers per district / automatic manager selection
- Farms and cow rooms
- Audit-log and activity-history pages
- Per-manager thresholds, acknowledge/escalate workflows, per-user alert rules
- Email/SMS/push delivery of alerts and messages
- Deployment and `trust proxy` configuration
- MQTT admin / health pages; managers registering new devices
- Email-based password reset, email verification, email invites
- OAuth / third-party login

---

## Phase History

- **Phase 1**: Single dashboard page — header/status, polling-based current readings, threshold indicators, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, simulator, daily-average charting, reading log page, calendar min/max view.
- **Phase 3 (COMPLETE)**: MQTT pipeline replaced the direct-to-Mongo simulator.
- **Phase 4 (COMPLETE)**: Authentication (Register/Login), Link Device, route guards, data scoped to the linked device.
- **Phase 5 (COMPLETE)**: Six devices, one account per device, per-device socket rooms.
- **Phase 6 (COMPLETE)**: Multiple devices per user, header device switcher, "Add device" flow.
- **Phase 7 (COMPLETE)**: RBAC — farmer / manager / admin, district-based manager, device-request approval via a request dialog, manager and admin panels, profile pages for all roles.
- **Phase 8 (COMPLETE)**: Notification bell with persisted debounced alerts, Asia/Dhaka time windows, trend chart metric selector with threshold bands (safe/warning/danger for all four metrics, methane danger confirmed above 12,500 ppm).
- **Phase 9 (COMPLETE)**: Security hardening (rate limiting with `skipSuccessfulRequests` on login, `helmet`, 100 KB body limit, `req.body` sanitization + `rejectOperatorKeys` query validation, forced first-login password change, `PASSWORD_UNCHANGED` check, socket revalidation), cleanup, reliability (`error.code`, graceful shutdown, structured redacting logger, `/health` DB check, React `ErrorBoundary` + `ServerUnreachable`, `NO_READINGS_FOUND` empty state, `farmerId` on alerts), and account/device management (device nicknames, device unlink + `unlinked` status + alert engine reset, removed-manager restore, admin manager password reset, Reading Log CSV export).
- **Phase 10 (COMPLETE)**: Localization (English and Bangla) — zero-dependency `LanguageContext` + `prohori_lang` persistence (browser auto-detect fallback), `Noto Sans Bengali` font integration, identical English and Bangla JSON dictionaries (341 keys each, 0 unused keys) verified via `npm run i18n:check`, `LanguageToggle` header/shell integration, `Intl.RelativeTimeFormat` date formatting with Latin numerals, complete translations across all authentication, farmer, manager, admin, and profile views, localized divisions/districts, complete server error code translation with network fallback, and dead-key cleanup.
- **Phase 11 (COMPLETE)**: Farmer ↔ Manager direct messaging, per-user socket rooms (`user:<userId>`), methane threshold bands parity update (warning 1,000–12,500, danger >12,500), 0-device socket connection support for farmers and managers, unread badge in header, responsive mobile chat UX strictly adhering to `DESIGN.md`.
- **Phase 12**: Dark Mode and Settings — system-wide dark palette overrides for existing tokens, `localStorage` preferences (`prohori_theme`, `prohori_text_size`, `prohori_reduce_motion`), anti-flash inline script, root `rem` typography scaling (Normal / Large), animation/transition suppression under reduced motion, `/settings` page for all roles with appearance, language, live threshold guide, profile navigation, and preferences reset dialog.