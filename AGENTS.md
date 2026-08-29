# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 2 — COMPLETE

Phase 2 added **real-time push** (Socket.IO + MongoDB Change Streams, replacing polling), a **Python device simulator** (writes synthetic readings into `G3036` since the physical device isn't live yet), **daily-average charting**, an **unbounded Reading Log page**, and a **Calendar min/max view**. Routing was introduced — three pages instead of one. See `PAGES.md` for exact screens/sections in scope.

All sub-stages (8a–8e) are done and verified working end-to-end: docs, Stitch designs, backend endpoints + real-time wiring, Python simulator, and frontend routing/wiring (including Socket.IO client integration, History and Calendar page builds, and the Dashboard chart's swap to daily-averages).

### Real-time architecture (IMPLEMENTED)
- Backend watches `G3036` via MongoDB Change Streams (`server/src/sockets/changeStream.js`), requires Atlas replica set — already true for the existing cluster.
- On insert, backend emits a `new-reading` Socket.IO event with the zone-classified document (same shape as the `/api/readings/latest` response).
- Change stream errors trigger a 5-second delayed reconnect rather than crashing the process; reconnect logic guards against stacking multiple concurrent streams.
- `server/src/app.js` wraps Express in `http.createServer`, attaches a `socket.io` Server instance reusing the same `CLIENT_ORIGIN` CORS config as the REST API. Change stream init happens after `connectDB()` resolves.
- Frontend: `client/src/services/socket.js` exports a single shared `socket.io-client` instance. `useLatestReading.js` does one initial REST fetch (fallback before the socket connects), then subscribes to `new-reading` and updates state directly — no more polling loop. Hook's return shape (`{ data, loading, error }`) is unchanged from Phase 1, so no consuming component needed to change.

### Device Simulator (IMPLEMENTED)
- Top-level folder: `simulator/` (Python, a separate process from `server/` and `client/`).
- Writes directly to `iotdb.G3036` on a ~60s interval, matching the exact schema — `device_id`, `ammonia`, `methane`, `humidity`, `temperature`, `timestamp`, `created_at`.
- Values random-walk within realistic ranges (occasionally drifting into warning/danger, including a methane spike-persistence mechanism that overrides a single tick's written value without corrupting the underlying walk state) for a believable demo.
- Reads `MONGO_URI` from its own `simulator/.env` (reuses the same Atlas connection string as `server/.env`, but is a distinct process — never merged into `server/`).
- This is the only writer to `G3036`; `server/` remains read-only, same as Phase 1.
- Run via `cd simulator && python -m venv venv && source venv/bin/activate (or venv/Scripts/activate on Windows) && pip install -r requirements.txt`, then populate `.env` from `.env.example` and run `python simulate_device.py`.

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend (Phase 2, implemented)
- MongoDB Change Streams — detects new inserts into `G3036` (Phase 2, implemented)
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Simulator (Phase 2, implemented)**
- Python (`pymongo`) — standalone script, writes synthetic readings into `G3036` on an interval

**Database**
- MongoDB Atlas (existing cluster; populated by the simulator, later by the physical Prohori device)
- Database: `iotdb`, Collection: `G3036`
- **Read-only from `server/`** — never write, update, or delete documents in this collection from the API layer; only `simulator/` writes

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing (Phase 2, implemented — three routes: `/`, `/history`, `/calendar`)
- Tailwind CSS — utility-first styling, used to implement the Stitch design system (colors, spacing, typography tokens live in `client/src/index.css` under `@theme`, matching `DESIGN.md`)
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates (Phase 2, implemented)
- axios — HTTP client for calling the backend API

**Real-time strategy (Phase 2): Socket.IO + Change Streams**
- Replaces Phase 1 polling
- Chosen once the simulator provides continuous writes, making push-based updates worthwhile

**Design source:** Stitch-exported design, translated into Tailwind classes — see `DESIGN.md`

## Data Source — DO NOT GUESS FIELD NAMES

Database: `iotdb`
Collection: `G3036`

Document shape (confirmed from live data, do not alter):

```js
{
  _id: ObjectId,
  device_id: String,       // "G3036"
  ammonia: Number,         // Double, ppm
  methane: Number,         // Double, ppm
  humidity: Number,        // Int — CONFIRMED unit: percent (%)
  temperature: Number,     // Int, likely °F
  timestamp: Number,       // Unix epoch seconds, set by device
  created_at: Date         // ISODate, set by DB insert — use this for sorting/filtering, not `timestamp`
}
```

Rules:
- Never invent fields that aren't in this schema.
- `server/` never writes/inserts/updates documents in this collection — read-only. Only `simulator/` writes, matching this exact schema.
- Use `created_at` (not `timestamp`) for all date range queries, sorting, and aggregation grouping, since it's a proper Mongo Date type.
- Connection string lives in `server/.env` as `MONGO_URI` — never hardcode it, never commit `.env`. The simulator uses its own env file with the same variable name.

## Folder Structure

```
prohori-dashboard/
│
├── server/                        # Express API — reads from MongoDB, serves REST + Socket.IO
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Mongoose connection setup, reads MONGO_URI from .env
│   │   ├── models/
│   │   │   └── Reading.js         # Mongoose schema mapped to the G3036 collection (read-only use)
│   │   ├── controllers/
│   │   │   └── readingsController.js   # Logic for each endpoint: latest, history, daily-averages, log, calendar, day
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification logic (safe/warning/danger) per metric — single source of truth
│   │   ├── routes/
│   │   │   └── readings.js        # Express router: wires URLs (/api/readings/...) to controller functions
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Centralized error handling, returns consistent JSON error shape
│   │   ├── sockets/
│   │   │   └── changeStream.js    # Watches G3036 via Change Streams, emits `new-reading` via Socket.IO (implemented)
│   │   └── app.js                 # Express app setup: middleware, routes, CORS, Socket.IO server, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN — gitignored, never commit
│   ├── .env.example               # Same keys as .env but with placeholder values — safe to commit
│   └── package.json
│
├── simulator/                     # Python device simulator — writes synthetic readings into G3036 (implemented)
│   ├── simulate_device.py         # Main loop: generate + insert a reading on an interval
│   ├── .env                       # MONGO_URI — gitignored, never commit
│   ├── .env.example
│   └── requirements.txt
│
├── client/                        # React (Vite) frontend — the dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx           # Left nav: logo, NavLink-based routes, device status block
│   │   │   │   └── Header.jsx            # Top bar: page title (via `title` prop), device ID, online/offline badge
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx        # One metric's live value (ammonia/methane/humidity/temp)
│   │   │   │   ├── ReadingsPanel.jsx     # Grid wrapper that lays out the 4 SensorCards
│   │   │   │   ├── HistoryTable.jsx      # Table of readings — used on the dedicated History page, server-paginated
│   │   │   │   ├── HistoryTabs.jsx       # "7d" / "30d" toggle control (Dashboard chart only)
│   │   │   │   └── TrendChart.jsx        # Recharts line chart — plots daily averages (ammonia_avg/methane_avg)
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx      # Month-view grid, plain/neutral day cells, prev/next nav
│   │   │   │   └── DayDetailCards.jsx    # Min/max cards shown after clicking a day — echoes SensorCard's visual language without depending on it
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx       # Reusable online/offline colored-dot badge
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # `/` — Sidebar + Header + ReadingsPanel + Chart
│   │   │   ├── History.jsx        # `/history` — dedicated unbounded, server-paginated Reading Log page
│   │   │   └── Calendar.jsx       # `/calendar` — calendar min/max view
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Socket.IO listener (initial REST fetch as fallback before socket connects)
│   │   │   ├── useReadingsHistory.js     # Fetches daily-averages for the Dashboard chart's 7d/30d toggle
│   │   │   ├── useReadingsLog.js         # Fetches paginated, unbounded reading log for the History page
│   │   │   ├── useCalendarData.js        # Fetches the month grid data for the Calendar page
│   │   │   ├── useDayDetail.js           # Fetches one day's min/max detail on demand (Calendar drill-down)
│   │   │   └── useDeviceStatus.js        # Shared online/offline + lastUpdated logic, wraps useLatestReading — used by all three pages so Header status stays in sync everywhere
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance + functions wrapping each backend endpoint
│   │   │   └── socket.js           # Socket.IO client instance/connection setup (implemented)
│   │   ├── App.jsx                # react-router-dom routes: /, /history, /calendar
│   │   ├── main.jsx                # Vite/React entry point
│   │   └── index.css              # Tailwind directives + any global overrides
│   ├── .env                       # VITE_API_URL — gitignored
│   ├── .env.example
│   └── package.json
│
├── AGENTS.md                      # This file — stack, schema, conventions, folder guide
├── PAGES.md                       # Screen/section breakdown for the current phase
├── DESIGN.md                      # Stitch design output translated into design tokens/specs
└── README.md                      # Setup instructions, how to run server + client + simulator locally
```

**Why this structure:**
- `server/`, `client/`, and `simulator/` are fully separate processes with their own `package.json`/`requirements.txt` and `.env` — run independently, communicate only over HTTP/MongoDB/sockets.
- Inside `client/src/components/`, folders are grouped by *purpose* (`layout`, `dashboard`, `calendar`, `common`) rather than dumping everything in one flat folder.
- `hooks/` isolates all data-fetching/real-time logic away from UI components — a `SensorCard` just receives a value as a prop, it doesn't know or care how that value was fetched. This is why swapping polling for Socket.IO only touched `useLatestReading.js`, not any component.
- `pages/` vs `components/`: each file in `pages/` is a routed, full-page assembly; everything in `components/` is a smaller reusable piece.
- `useDeviceStatus.js` exists because online/offline + last-updated logic was originally duplicated only in `Dashboard.jsx`; once History and Calendar pages needed the same live status in their `Header`, that logic was extracted into a shared hook so all three pages read off one source of truth instead of drifting independently.

## API Contract (Phase 2 — implemented)

- `GET /api/readings/latest` → single most recent document + zone classifications (fallback before the socket connects)
- `GET /api/readings/daily-averages?range=7d|30d` → array of `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }`, one entry per day, sorted ascending — Dashboard chart's data source
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }`, paginated, unbounded, newest-first — Reading Log page's data source
- `GET /api/readings/calendar?month=YYYY-MM` → array of `{ date, ammonia_min, ammonia_max, ammonia_min_zone, ammonia_max_zone, methane_min, methane_max, methane_min_zone, methane_max_zone, humidity_min, humidity_max, humidity_min_zone, humidity_max_zone, temperature_min, temperature_max, temperature_min_zone, temperature_max_zone }` per day in the month — min and max are each classified independently
- `GET /api/readings/day/:date` → full min/max detail for one day (Calendar drill-down)
- `GET /health` → basic server health check, returns `{ status: "ok" }`
- **Socket.IO event:** `new-reading` → emitted on each new insert into `G3036` (via Change Streams), payload shape matches `/api/readings/latest`

**Open question, still unresolved:** `GET /api/readings/history?range=7d|30d` (raw readings, Phase 1) still exists server-side and is still callable (`getReadingsHistory` remains in `client/src/services/api.js`), but nothing in the frontend calls it anymore — `daily-averages` replaced it for the Dashboard chart, and `/log` covers the unbounded table. Decide whether to keep it as a documented-but-unused endpoint or remove the route/controller/service function entirely.

## Future: Beyond Phase 2 (for context only)

Once the physical device replaces the simulator, no application code should need to change — the simulator and the physical device both just insert documents matching the same schema into `G3036`. Change Streams and Socket.IO wiring are agnostic to which process is writing.

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only — no separate CSS files per component, no CSS-in-JS libraries.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN` (for CORS) in `server/.env`; `VITE_API_URL` in `client/.env`; `MONGO_URI` in `simulator/.env`.
- Commit `.env.example` files with placeholder values in `server/`, `client/`, and `simulator/` — never commit real `.env`.
- Keep components small and single-purpose (one card = one component, one hook = one data concern).
- Tailwind design tokens (colors, font, spacing) live in `client/src/index.css` under `@theme`, mirroring `DESIGN.md` — avoid hardcoding hex values inline in JSX; use named tokens (e.g. `bg-status-online`).
- New components that need to echo an existing component's visual language (e.g. `DayDetailCards` mirroring `SensorCard`) should be built as their own self-contained component rather than modifying the original to support a new use case — keeps each component's blast radius contained. `DayDetailCards` is the established example of this pattern.

## Threshold / Alert Logic (ACTIVE — unchanged since Phase 1)

The company has provided target threshold values for each metric, used to classify every reading (live, historical, or averaged) into one of three zones: **Safe**, **Warning**, or **Danger**. This drives the visual alert indicators on the dashboard (see `PAGES.md`).

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

Implementation notes:
- **Humidity and temperature are two-sided** — both too low AND too high are unsafe. Threshold logic must check both directions, not just a single upper bound.
- **Methane has a large gap** between its warning ceiling (5,000 ppm) and danger floor (50,000 ppm) — implemented exactly as given; do not interpolate an extra band unless the company clarifies otherwise.
- Zone classification is computed **server-side** (in the controller, alongside each reading/average) so the frontend just renders a `zone` field rather than re-implementing the threshold logic.
- For daily averages (Dashboard chart), zone is computed off the **averaged** value per day.
- For the Calendar page's min/max view, **min and max are classified independently** against the threshold table per metric per day (e.g. a day's ammonia min could be Safe while its max is Warning) — confirmed working correctly (e.g. observed live: a day where methane's max crossed into Danger while its min stayed Safe, rendered with independent colors as designed).
- This phase is **visual indication only** — colored badges/borders/cells. No push notifications, email, SMS, or sound alerts. Those remain a later-phase feature.
- If the company revises any threshold values, update this table first — it's the source of truth for the alert logic.

## Known Temporary Workarounds (Still Open — Revisit Now That the Simulator Has Been Running)

These were carried from Phase 1 and are **not yet resolved**, even though the simulator has been writing continuously since 8d:

- **Cutoffs**: `getHistory` and `getDailyAverages` still use document-count `.limit()` windowing (`COUNT_BY_RANGE = { '7d': 300, '30d': 1200 }`) instead of a genuine `Date.now()`-relative `$gte` filter on `created_at`. Now that the simulator has been running for a while and producing continuous real-time data, confirm whether the count-based approach still produces sensible results or whether it's time to switch back to a literal time-window cutoff.
- **UTC day-boundary grouping**: `getDailyAverages` groups readings into calendar days via `$dateToString` on `created_at` with no explicit `timezone` option, so grouping is in UTC. For a Bangladesh-based user (UTC+6), a reading logged late in the BD evening can get grouped into the *next* UTC day on the chart. Verify this against real simulator data spanning several BD evenings before deciding whether to add `timezone: "Asia/Dhaka"` to the `$dateToString` stage.
- Search `TODO(revert-for-production)` in `readingsController.js` for the exact spots.

## Out of Scope for This Phase (do not build yet)

- Push/email/SMS notifications for alerts (Phase 2 alerts are still visual/in-dashboard only)
- Multi-device support
- Authentication/user accounts
- Any endpoint that writes to the `G3036` collection from `server/` (writes remain `simulator/`'s job only)

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts — current readings, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one. All sub-stages (8a–8e) verified working end-to-end. Two documented temporary workarounds remain open (see above) and the raw `/history` endpoint's deprecation is an undecided open question — otherwise ready for supervisor demo/review.