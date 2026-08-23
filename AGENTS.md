# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 2

Phase 2 = adds **real-time push** (Socket.IO + MongoDB Change Streams, replacing polling), a **Python device simulator** (writes synthetic readings into `G3036` since the physical device isn't live yet), **daily-average charting**, an **unbounded Reading Log page**, and a **Calendar min/max view**. Routing is introduced — three pages instead of one. See `PAGES.md` for exact screens/sections in scope.

### Real-time architecture
- Backend watches `G3036` via MongoDB Change Streams (requires Atlas replica set — already true for the existing cluster)
- On insert, backend emits a `new-reading` Socket.IO event with the zone-classified document (same shape as the `/api/readings/latest` response)
- Frontend: `useLatestReading.js` swaps its polling loop for a socket listener — per the Phase 1 "Future Real-Time Upgrade Path" design, no other component should need to change since components only consume this hook's return shape

### Device Simulator
- New top-level folder: `simulator/` (Python, a separate process from `server/` and `client/`)
- Writes directly to `iotdb.G3036` on an interval, matching the exact schema — `device_id`, `ammonia`, `methane`, `humidity`, `temperature`, `timestamp`, `created_at`
- Values should random-walk within realistic ranges (occasionally drifting into warning/danger) rather than pure random, for a believable demo
- Reads `MONGO_URI` from its own env file (can reuse the same Atlas connection string as `server/.env`, but is a distinct process — never merge into `server/`)
- This is the only writer to `G3036`; `server/` remains read-only, same as Phase 1

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend (Phase 2)
- MongoDB Change Streams — detects new inserts into `G3036` (Phase 2)
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Simulator (Phase 2)**
- Python (`pymongo`) — standalone script, writes synthetic readings into `G3036` on an interval

**Database**
- MongoDB Atlas (existing cluster; populated by the simulator in Phase 2, later by the physical Prohori device)
- Database: `iotdb`, Collection: `G3036`
- **Read-only from `server/`** — never write, update, or delete documents in this collection from the API layer; only `simulator/` writes

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing (Phase 2, new dependency)
- Tailwind CSS — utility-first styling, used to implement the Stitch design system (colors, spacing, typography tokens live in `client/src/index.css` under `@theme`, matching `DESIGN.md`)
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates (Phase 2)
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
│   │   │   └── readingsController.js   # Logic for each endpoint: latest, history, daily-averages, log, calendar
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification logic (safe/warning/danger) per metric — single source of truth
│   │   ├── routes/
│   │   │   └── readings.js        # Express router: wires URLs (/api/readings/...) to controller functions
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Centralized error handling, returns consistent JSON error shape
│   │   ├── sockets/
│   │   │   └── changeStream.js    # Phase 2: watches G3036 via Change Streams, emits `new-reading` via Socket.IO
│   │   └── app.js                 # Express app setup: middleware, routes, CORS, Socket.IO server, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN — gitignored, never commit
│   ├── .env.example               # Same keys as .env but with placeholder values — safe to commit
│   └── package.json
│
├── simulator/                     # Phase 2: Python device simulator — writes synthetic readings into G3036
│   ├── simulate_device.py         # Main loop: generate + insert a reading on an interval
│   ├── .env                       # MONGO_URI — gitignored, never commit
│   ├── .env.example
│   └── requirements.txt
│
├── client/                        # React (Vite) frontend — the dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx           # Left nav: logo, nav links (now real routes), device status block
│   │   │   │   └── Header.jsx            # Top bar: page title, device ID, online/offline badge
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx        # One metric's live value (ammonia/methane/humidity/temp)
│   │   │   │   ├── ReadingsPanel.jsx     # Grid wrapper that lays out the 4 SensorCards
│   │   │   │   ├── HistoryTable.jsx      # Table of readings — now used on the dedicated History page, unbounded
│   │   │   │   ├── HistoryTabs.jsx       # "Last 7 Days" / "Last 30 Days" toggle control (chart only, Phase 2)
│   │   │   │   └── TrendChart.jsx        # Recharts line chart — plots daily averages, not raw readings (Phase 2)
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx      # Phase 2: month-view grid, plain/neutral day cells
│   │   │   │   └── DayDetailCards.jsx    # Phase 2: min/max cards shown after clicking a day
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx       # Reusable online/offline colored-dot badge
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # `/` — Sidebar + Header + ReadingsPanel + Chart (log removed, Phase 2)
│   │   │   ├── History.jsx        # `/history` — Phase 2: dedicated unbounded Reading Log page
│   │   │   └── Calendar.jsx       # `/calendar` — Phase 2: calendar min/max view
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Phase 2: Socket.IO listener (was polling in Phase 1)
│   │   │   ├── useReadingsHistory.js     # Fetches daily-averages for the chart's 7d/30d toggle
│   │   │   ├── useReadingsLog.js         # Phase 2: fetches paginated, unbounded reading log
│   │   │   └── useCalendarData.js        # Phase 2: fetches month grid + day drill-down data
│   │   ├── services/
│   │   │   ├── api.js              # Axios instance + functions wrapping each backend endpoint
│   │   │   └── socket.js           # Phase 2: Socket.IO client instance/connection setup
│   │   ├── App.jsx                # Phase 2: sets up react-router-dom routes (/, /history, /calendar)
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
- `hooks/` isolates all data-fetching/real-time logic away from UI components — a `SensorCard` just receives a value as a prop, it doesn't know or care how that value was fetched. This is why swapping polling for Socket.IO in Phase 2 only touched `useLatestReading.js`, not any component.
- `pages/` vs `components/`: each file in `pages/` is a routed, full-page assembly; everything in `components/` is a smaller reusable piece.

## API Contract (Phase 2)

- `GET /api/readings/latest` → single most recent document + zone classifications (still available; used as an initial-load fallback before the socket connects)
- `GET /api/readings/daily-averages?range=7d|30d` → array of `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }`, one entry per day
- `GET /api/readings/log?page=&limit=` → paginated, unbounded, newest-first array of documents with zones
- `GET /api/readings/calendar?month=YYYY-MM` → array of `{ date, ammonia_min, ammonia_max, methane_min, methane_max, humidity_min, humidity_max, temperature_min, temperature_max }` per day in the month
- `GET /api/readings/day/:date` → full min/max detail for one day (calendar drill-down)
- `GET /health` → basic server health check, returns `{ status: "ok" }`
- **Socket.IO event:** `new-reading` → emitted on each new insert into `G3036` (via Change Streams), payload shape matches `/api/readings/latest`

**Note:** `GET /api/readings/history?range=7d|30d` (raw readings, Phase 1) may still exist server-side but is no longer the frontend's primary chart data source — `daily-averages` replaces it for the Chart Section. Confirm with the team whether to keep, deprecate, or remove the raw endpoint once the simulator is providing continuous data and the "Known Temporary Workarounds" below are no longer needed.

## Future: Beyond Phase 2 (for context only)

Once the physical device replaces the simulator, no application code should need to change — the simulator and the physical device both just insert documents matching the same schema into `G3036`. Change Streams and Socket.IO wiring are agnostic to which process is writing.

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only — no separate CSS files per component, no CSS-in-JS libraries.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN` (for CORS) in `server/.env`; `VITE_API_URL` in `client/.env`; `MONGO_URI` in `simulator/.env`.
- Commit `.env.example` files with placeholder values in `server/`, `client/`, and `simulator/` — never commit real `.env`.
- Keep components small and single-purpose (one card = one component, one hook = one data concern).
- Tailwind design tokens (colors, font, spacing) live in `client/src/index.css` under `@theme`, mirroring `DESIGN.md` — avoid hardcoding hex values inline in JSX; use named tokens (e.g. `bg-status-online`).

## Threshold / Alert Logic (ACTIVE — Phase 2, unchanged from Phase 1)

The company has provided target threshold values for each metric, used to classify every reading (live, historical, or averaged) into one of three zones: **Safe**, **Warning**, or **Danger**. This drives the visual alert indicators on the dashboard (see `PAGES.md`).

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

Implementation notes:
- **Humidity and temperature are two-sided** — both too low AND too high are unsafe. Threshold logic must check both directions, not just a single upper bound.
- **Methane has a large gap** between its warning ceiling (5,000 ppm) and danger floor (50,000 ppm) — implement exactly as given; do not interpolate an extra band unless the company clarifies otherwise.
- Zone classification is computed **server-side** (in the controller, alongside each reading/average) so the frontend just renders a `zone` field rather than re-implementing the threshold logic.
- For daily averages, zone is computed off the **averaged** value per day (open question flagged to the team: whether to instead classify off that day's min/max extremes — current default is average-based unless revised).
- This phase is **visual indication only** — colored badges/borders/cells. No push notifications, email, SMS, or sound alerts. Those remain a later-phase feature.
- If the company revises any threshold values, update this table first — it's the source of truth for the alert logic.

## Known Temporary Workarounds (Carried from Phase 1 — Revisit Now That the Simulator Provides Continuous Data)

The original seeded MongoDB dataset (1,779 docs, spanning roughly Sept 18 – Nov 24 2024) was stale and bursty, which required two temporary workarounds in the old `getHistory` controller (anchoring cutoffs to the latest document's `created_at` instead of `Date.now()`, and using a document-count window instead of a literal calendar-time window). Search `TODO(revert-for-production)` in `readingsController.js`.

**Now that the simulator writes continuously in real time**, these workarounds should be revisited:
- Cutoffs can likely switch back to genuine `Date.now()`-relative `$gte` filters on `created_at`, since "now" and the data will actually be close together going forward.
- The document-count `.limit()` approach may no longer be necessary for `daily-averages` or `log`, since continuous data won't have the same bursty-gap problem — confirm this holds once the simulator has been running for a few days before removing the workaround entirely.

## Out of Scope for This Phase (do not build yet)

- Push/email/SMS notifications for alerts (Phase 2 alerts are still visual/in-dashboard only)
- Multi-device support
- Authentication/user accounts
- Any endpoint that writes to the `G3036` collection from `server/` (writes remain `simulator/`'s job only)

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts — current readings, 7d/30d history, chart.
- **Phase 2** (current): Real-time via Socket.IO + Change Streams, Python device simulator, daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.