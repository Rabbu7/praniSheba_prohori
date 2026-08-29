# PAGES.md

> Defines the screens/pages/sections that should exist in the app for the current phase.
> Updated at the start of every new phase — sections marked "future" are NOT to be built yet.

## Phase 2 — Pages & Sections — STATUS: COMPLETE

Phase 2 introduced routing. Three pages, shared Sidebar + Header layout. All three are built and verified working.

### Page: Dashboard (`/`) — DONE

**1. Header** — device ID, Online/Offline badge, last updated. Now driven by the shared `useDeviceStatus` hook (see `AGENTS.md`) rather than page-local logic, so status stays in sync with History and Calendar's headers too.

**2. Current Readings Panel** — updates via **Socket.IO push** (`new-reading` event) instead of polling. `useLatestReading.js` uses a socket listener with an initial REST fetch as a fallback before the socket connects; no component beyond the hook needed to change.

**3. Chart Section**
- Plots **daily average** values per metric (not raw readings) — Recharts line chart.
- Shares 7d/30d toggle (`HistoryTabs`).
- Data source: `GET /api/readings/daily-averages?range=7d|30d`.
- Zone coloring/threshold bands apply to the daily-average value.
- Confirmed the date axis now sorts ascending correctly (an earlier bug where raw-history timestamps rendered out of order was resolved as a side effect of this endpoint swap, since `daily-averages` sorts server-side).

**Reading Log is REMOVED from this page** — moved to its own page (see below). Confirmed removed.

---

### Page: Reading Log (`/history`) — DONE

- Full paginated table of all readings, **no 7d/30d limit** — unbounded, newest first.
- Columns: timestamp, ammonia, methane, humidity, temperature — each cell zone-colored, same convention as Phase 1.
- **Server-side pagination** (not client-side slicing) via `GET /api/readings/log?page=&limit=`, returning `{ data, page, limit, total, totalPages }`. `HistoryTable` receives `page`/`totalPages`/`onPageChange` as props rather than owning pagination state internally.
- Sidebar's "History" nav link routes here via `react-router-dom`.

---

### Page: Calendar (`/calendar`) — DONE

- Month-view calendar grid, plain/neutral day cells (no pre-coloring by zone) — confirmed cells stay neutral regardless of underlying zone data, only selected/today states get visual treatment.
- Clicking a day reveals 4 cards (Ammonia, Methane, Humidity, Temperature) showing that day's **min/max** values, each independently zone-colored (`ammonia_min_zone` vs `ammonia_max_zone` can differ and do render differently — confirmed working, e.g. observed a day where methane's max was Danger-red while its min was Safe-green).
- Data source: `GET /api/readings/calendar?month=YYYY-MM` for the grid, `GET /api/readings/day/:date` for the drill-down.
- Prev/next month navigation implemented; selecting a day in one month and then navigating to a different month clears the selection (UX default chosen during build — not explicitly spec'd, flagged as a judgment call at the time).
- Has its own Sidebar nav icon (`calendar_month`).

---

### Sidebar (all pages) — DONE
- Nav links are real routes via `NavLink`: Dashboard (`/`), History (`/history`), Calendar (`/calendar`), Settings (still disabled). Active route gets a distinct highlight style on both desktop and mobile bottom nav.

---

## Explicitly NOT in Phase 2 (future phases)

- Push/email/SMS notifications
- Multi-device selector/switcher
- Settings/configuration page
- User login/auth
- Export/download data feature

---

## Known follow-ups (not blockers, not yet scheduled)

These surfaced during the Phase 2 build but are intentionally deferred rather than being in-scope fixes:

- **Raw `/history` endpoint**: still exists and is callable but nothing in the frontend uses it anymore. Decide whether to keep as documented-unused or remove. See `AGENTS.md`'s API Contract section.
- **UTC day-boundary grouping** in `daily-averages`: may misalign day boundaries for a UTC+6 (Bangladesh) user. Needs verification against several days of real continuous simulator data before deciding on a fix. See `AGENTS.md`'s Known Temporary Workarounds section.
- **Count-based history windowing**: `getHistory`/`getDailyAverages` still use a document-count `.limit()` instead of a real time-window cutoff — carried over from when the seeded dataset was bursty. Worth revisiting now that the simulator provides continuous data.
- **SensorCard/ReadingsPanel visual polish**: Dashboard's readings column and chart section required a few rounds of layout fixes (grid alignment, single-screen fit) to match the Stitch reference; the current fix reduced card padding/font size and reader panel spacing to fit within one viewport height. Worth a final visual pass against the Stitch reference at a range of viewport sizes (not just the one tested) if further polish is wanted.

---

## Phase History

- **Phase 1**: Single dashboard page — header/status, polling-based current readings panel with threshold alert indicators, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one. All pages built, wired to live data, and verified working end-to-end — ready for supervisor demo.