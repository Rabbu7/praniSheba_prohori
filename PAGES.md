# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 2 — Pages & Sections

Phase 2 introduces routing. Three pages, shared Sidebar + Header layout.

### Page: Dashboard (`/`)

**1. Header** — unchanged from Phase 1 (device ID, Online/Offline badge, last updated).

**2. Current Readings Panel** — unchanged layout/zone logic, but now updates via **Socket.IO push** (`new-reading` event) instead of polling. `useLatestReading` swaps its interval loop for a socket listener; no other component changes.

**3. Chart Section**
- Plots **daily average** values per metric (not raw readings) — Recharts line chart
- Shares 7d/30d toggle
- Data source: `GET /api/readings/daily-averages?range=7d|30d`
- Zone coloring/threshold bands (if implemented) apply to the daily-average value

**Reading Log is REMOVED from this page** — moved to its own page (see below).

---

### Page: Reading Log (`/history`)

- Full paginated table of all readings, **no 7d/30d limit** — unbounded, newest first
- Columns: timestamp, ammonia, methane, humidity, temperature — each cell zone-colored, same convention as Phase 1
- Pagination controls (page-based or "load more")
- Data source: `GET /api/readings/log?page=&limit=`
- Sidebar's "History" nav link routes here (previously scrolled to an anchor on Dashboard — now a real route)

---

### Page: Calendar (`/calendar`)

- Month-view calendar grid, plain/neutral day cells (no pre-coloring by zone)
- Clicking a day reveals 4 cards (Ammonia, Methane, Humidity, Temperature) showing that day's **min/max** values — visually consistent with `SensorCard` but adapted for a min/max pair instead of a single live value
- Data source: `GET /api/readings/calendar?month=YYYY-MM` for the grid, `GET /api/readings/day/:date` (or similar) for the drill-down
- Needs its own Sidebar nav icon

---

### Sidebar (all pages)
- Nav links become real routes: Dashboard (`/`), History (`/history`), Calendar (`/calendar`), Settings (still disabled)

---

## Explicitly NOT in Phase 2 (future phases)

- Push/email/SMS notifications
- Multi-device selector/switcher
- Settings/configuration page
- User login/auth
- Export/download data feature

---

## Phase History

- **Phase 1**: Single dashboard page — header/status, polling-based current readings panel with threshold alert indicators, 7d/30d history, chart.
- **Phase 2** (current): Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.