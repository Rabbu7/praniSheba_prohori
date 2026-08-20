# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 1 — Pages & Sections

### Page: Dashboard (`/`)

Single page for Phase 1. No routing/multi-page needed yet.

**1. Header**
- App/product name ("Prohori Dashboard" or similar — align with Stitch design)
- Device identifier: `G3036`
- Device status badge: **Online** / **Offline**
  - Logic: Online if latest `created_at` is within the last 5 minutes, else Offline. (Threshold configurable, not hardcoded.)

**2. Current Readings Panel ("proximity output")**
- 4 live cards, one per metric:
  - Ammonia (ppm)
  - Methane (ppm)
  - Humidity (%)
  - Temperature (°F)
- Each card shows: label, current value, unit, small trend indicator (up/down vs previous reading) — trend indicator optional if time is tight.
- **Alert zone indicator**: each card visually reflects its Safe / Warning / Danger classification (see `AGENTS.md` Threshold / Alert Logic), e.g. a colored left-border or badge — green (safe), amber (warning), red (danger). This is the primary visual alert mechanism for Phase 1.
- Updates via polling — no manual refresh needed from the user, but not instant push either. Frontend re-fetches `GET /api/readings/latest` on an interval (e.g. every 10–15 seconds) using the `useLatestReading` hook.
- Data source: `GET /api/readings/latest`, called on initial load and then re-called on each poll interval. Response includes a `zone` field per metric.
- Card shows a brief highlight animation when a poll returns a changed value, so the update is noticeable even without a live socket push.

**3. History Section**
- Toggle/tab control: **Last 7 Days** / **Last 30 Days**
- Displays historical readings for the selected range as a table or list:
  - Columns: timestamp (human-readable, from `created_at`), ammonia, methane, humidity, temperature
  - Each metric value in the table reflects its zone (e.g. subtle colored text or cell background — green/amber/red) using the `zone` field returned by the API, matching the current readings panel's color logic
- Data source: `GET /api/readings/history?range=7d` or `?range=30d`

**4. Chart Section**
- Time-series line chart plotting the same metrics over the selected history range (shares the 7d/30d toggle with the History Section, or has its own — decide based on Stitch design)
- Library: Recharts
- At minimum: ammonia and methane on one chart (the primary safety-relevant gases); temperature/humidity can be a second chart or toggleable lines — finalize based on Stitch design layout
- Optional but encouraged: shaded horizontal reference bands or threshold lines on the chart showing where Warning/Danger zones begin for each metric, so spikes are visually obvious against the safe range

**5. Footer (optional)**
- Minimal — last synced time, or nothing if Stitch design omits it

---

## Explicitly NOT in Phase 1 (future phases)

- Push/email/SMS notifications or alert history log (Phase 1 alerts are visual/in-dashboard only — see Current Readings Panel and History Section above)
- Multi-device selector/switcher
- Settings/configuration page
- User login/auth
- Export/download data feature
- Historical data beyond 30 days / custom date range picker

---

## Phase History

- **Phase 1** (current): Single dashboard page — header/status, polling-based current readings panel with threshold alert indicators, 7d/30d history, chart.
