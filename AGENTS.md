# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 1

Phase 1 = **read-only dashboard** for a single device (`G3036`), with near-real-time updates via polling, plus **threshold-based alert indicators** using company-provided values. No sockets, no multi-device support, no write actions, no notifications (push/email/SMS) — alerts are visual/in-dashboard only for this phase. See `PAGES.md` for exact screens/sections in scope.

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Database**
- MongoDB Atlas (existing cluster, already populated by the physical Prohori device)
- Database: `iotdb`, Collection: `G3036`
- **Read-only** — never write, update, or delete documents in this collection

**Frontend**
- React (Vite) — SPA framework/build tool
- Tailwind CSS — utility-first styling, used to implement the Stitch design system (colors, spacing, typography tokens should be added to `tailwind.config.js` to match `DESIGN.md`)
- Recharts — the trend line chart in the Chart section
- axios — HTTP client for calling the backend API

**Real-time strategy (Phase 1): Polling**
- Frontend polls `GET /api/readings/latest` on an interval (e.g. every 10–15 seconds) using a custom hook, rather than a persistent socket connection
- Chosen for simplicity in Phase 1 — no Socket.IO, no Change Streams yet
- Architected so this can be swapped for Socket.IO + MongoDB Change Streams in a later phase without changing how components consume the data (see "Future: Real-Time Upgrade Path" below)

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
- Never write/insert/update documents in this collection — read-only.
- Use `created_at` (not `timestamp`) for all date range queries and sorting, since it's a proper Mongo Date type.
- Connection string lives in `server/.env` as `MONGO_URI` — never hardcode it, never commit `.env`.

## Folder Structure

```
prohori-dashboard/
│
├── server/                        # Express API — reads from MongoDB, serves REST endpoints
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # Mongoose connection setup, reads MONGO_URI from .env
│   │   ├── models/
│   │   │   └── Reading.js         # Mongoose schema mapped to the G3036 collection (read-only use)
│   │   ├── controllers/
│   │   │   └── readingsController.js   # Logic for each endpoint: fetch latest, fetch history by range, attach zone classifications
│   │   ├── utils/
│   │   │   └── thresholds.js      # Zone classification logic (safe/warning/danger) per metric — the single source of truth, used by the controller
│   │   ├── routes/
│   │   │   └── readings.js        # Express router: wires URLs (/api/readings/...) to controller functions
│   │   ├── middleware/
│   │   │   └── errorHandler.js    # Centralized error handling, returns consistent JSON error shape
│   │   └── app.js                 # Express app setup: middleware, routes, CORS, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN — gitignored, never commit
│   ├── .env.example               # Same keys as .env but with placeholder values — safe to commit
│   └── package.json
│
├── client/                        # React (Vite) frontend — the dashboard UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx           # Left nav: logo, nav links, device status block
│   │   │   │   └── Header.jsx            # Top bar: page title, device ID, online/offline badge
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx        # One metric's live value (ammonia/methane/humidity/temp)
│   │   │   │   ├── ReadingsPanel.jsx     # Grid wrapper that lays out the 4 SensorCards
│   │   │   │   ├── HistoryTable.jsx      # Table of readings for the selected date range
│   │   │   │   ├── HistoryTabs.jsx       # "Last 7 Days" / "Last 30 Days" toggle control
│   │   │   │   └── TrendChart.jsx        # Recharts line chart of metrics over the selected range
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx       # Reusable online/offline colored-dot badge
│   │   ├── pages/
│   │   │   └── Dashboard.jsx      # Assembles Sidebar + Header + ReadingsPanel + History + Chart
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js       # Polls GET /api/readings/latest on an interval
│   │   │   └── useReadingsHistory.js     # Fetches GET /api/readings/history for the selected range
│   │   ├── services/
│   │   │   └── api.js             # Axios instance + functions wrapping each backend endpoint
│   │   ├── App.jsx                # Root component, renders the Dashboard page
│   │   ├── main.jsx                # Vite/React entry point
│   │   └── index.css              # Tailwind directives + any global overrides
│   ├── tailwind.config.js         # Color tokens, font family, spacing — should mirror DESIGN.md
│   ├── .env                       # VITE_API_URL — gitignored
│   ├── .env.example
│   └── package.json
│
├── AGENTS.md                      # This file — stack, schema, conventions, folder guide
├── PAGES.md                       # Screen/section breakdown for the current phase
├── DESIGN.md                      # Stitch design output translated into design tokens/specs
└── README.md                      # Setup instructions, how to run server + client locally
```

**Why this structure:**
- `server/` and `client/` are fully separate apps with their own `package.json` and `.env` — run independently (`npm run dev` in each), communicate only over HTTP.
- Inside `client/src/components/`, folders are grouped by *purpose* (`layout`, `dashboard`, `common`) rather than dumping everything in one flat folder — makes it obvious where a new component belongs as the app grows across phases.
- `hooks/` isolates all data-fetching/polling logic away from UI components — a `SensorCard` just receives a value as a prop, it doesn't know or care how that value was fetched. This makes swapping polling for Socket.IO later a change contained to `hooks/`, not a rewrite of every component.
- `pages/` vs `components/`: `Dashboard.jsx` in `pages/` is the only component that assembles the full page layout; everything in `components/` is a smaller reusable piece.

## API Contract (Phase 1)

- `GET /api/readings/latest` → single most recent document, sorted by `created_at` descending, with an added `zone` classification per metric (see Threshold / Alert Logic above)
- `GET /api/readings/history?range=7d|30d` → array of documents within that window, sorted by `created_at` ascending, each with `zone` classifications included
- `GET /health` → basic server health check, returns `{ status: "ok" }`

No sockets or push events in Phase 1 — frontend polls `/latest` on an interval (see `useLatestReading.js`).

## Future: Real-Time Upgrade Path (not Phase 1 — for context only)

When a later phase upgrades to true real-time push, the intended approach is: MongoDB Change Streams on the backend detecting new inserts into `G3036`, pushed to clients via Socket.IO as a `new-reading` event. On the frontend, only `useLatestReading.js` should need to change (swap its polling loop for a socket listener) — components consuming its returned data should not need changes if this hook's return shape stays the same.

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only — no separate CSS files per component, no CSS-in-JS libraries.
- Env vars: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN` (for CORS) in `server/.env`; `VITE_API_URL` in `client/.env`.
- Commit `.env.example` files with placeholder values in both `server/` and `client/`, never commit real `.env`.
- Keep components small and single-purpose (one card = one component, one hook = one data concern).
- Tailwind config (`tailwind.config.js`) should define the color palette, font, and spacing scale from `DESIGN.md` as named tokens (e.g. `bg-surface`, `text-muted`, `accent`) rather than agents hardcoding hex values inline in JSX.

## Threshold / Alert Logic (ACTIVE — Phase 1)

The company has provided target threshold values for each metric, used to classify every live and historical reading into one of three zones: **Safe**, **Warning**, or **Danger**. This drives the visual alert indicators on the dashboard (see `PAGES.md`).

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

Implementation notes:
- **Humidity and temperature are two-sided** — both too low AND too high are unsafe. Threshold logic must check both directions, not just a single upper bound.
- **Methane has a large gap** between its warning ceiling (5,000 ppm) and danger floor (50,000 ppm) — implement exactly as given; do not interpolate an extra band unless the company clarifies otherwise.
- Zone classification should be computed **server-side** (in the controller, alongside each reading) so the frontend just renders a `zone` field rather than re-implementing the threshold logic — keeps the source of truth in one place.
- Suggested field to add to API responses: `zone: "safe" | "warning" | "danger"` per metric, e.g. `{ ammonia: 12.4, ammonia_zone: "warning", ... }`.
- This phase is **visual indication only** — colored badges/borders on the dashboard. No push notifications, email, SMS, or sound alerts. Those remain a later-phase feature.
- If the company revises any threshold values, update this table first — it's the source of truth for the alert logic.

## Out of Scope for This Phase (do not build yet)

- Push/email/SMS notifications for alerts (Phase 1 alerts are visual/in-dashboard only)
- Socket.IO / MongoDB Change Streams (deferred — see upgrade path above)
- Multi-device support
- Authentication/user accounts
- Any endpoint that writes to the `G3036` collection

## Phase History

- **Phase 1** (current): Read-only single-device dashboard, polling-based updates, threshold-based visual alerts — current readings, 7d/30d history, chart.
