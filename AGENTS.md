# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 3 (IN PROGRESS)

Phase 3 replaces the Phase 2 Python simulator (which wrote directly to MongoDB) with a **live MQTT pipeline**, since the goal is to eventually consume real device data over MQTT rather than direct DB writes.

**Why not use the physical device yet:** the supervisor confirmed the real Prohori hardware/broker topics (`farm_controller/CATTLE_CTRL_001/event`, etc., explored during broker investigation) are currently offline/paused, and don't publish all 4 required fields (only `temperature`, `humidity`, and an unrelated `thi` field were observed — no `ammonia`/`methane`). Rather than wait on hardware, the supervisor asked us to build a **mimic device** that publishes realistic fake readings over MQTT, so the *real* MQTT→MongoDB pipeline can be built and proven now, and swapped for the physical device later with zero code changes (same pattern as the Phase 2 simulator → real device swap).

**Scope for this pass of Phase 3: a single mimic device.** Multi-device simulation (3+ concurrent mimic devices) was considered but explicitly deferred to a future phase to de-risk the first-ever MQTT integration — get one device working end-to-end before adding concurrency/differentiation complexity.

### Phase 3 Architecture

```
mimic-device/ (Python, paho-mqtt)
      │  publishes fake readings on an interval
      ▼
MQTT Broker (152.42.179.228:1885, user "apsIoT")
      │  topic: prohori/G3036/reading
      ▼
mqtt-bridge/ (Python, paho-mqtt subscriber + pymongo)
      │  parses payload, maps to Reading schema, inserts
      ▼
MongoDB Atlas — iotdb.G3036
      │  Change Streams (existing, unchanged)
      ▼
server/ (Socket.IO `new-reading` event — existing, unchanged)
      ▼
client/ dashboard (existing, unchanged)
```

**Key point:** everything downstream of `G3036` (Change Streams → Socket.IO → frontend) requires **zero changes** for Phase 3. The mimic device + bridge together just become the new writer, replacing `simulator/`, using the exact same `device_id` (`"G3036"`) and schema the old simulator used — so nothing else needs to know the data's origin changed.

### MQTT Topic & Payload Contract (CONFIRMED — source of truth for Phase 3)

- **Broker:** `152.42.179.228`, port `1885`
- **Auth:** username `apsIoT`, password via env var (never hardcoded — see Conventions)
- **Topic:** `prohori/G3036/reading` — a clean custom topic chosen for our mimic device (deliberately does NOT reuse the real device's `farm_controller/...` topic naming, since that belongs to different hardware/system)
- **Payload (JSON), published by `mimic-device/`, consumed by `mqtt-bridge/`:**

```json
{
  "device_id": "G3036",
  "ammonia": 12.4,
  "methane": 15.8,
  "humidity": 68,
  "temperature": 74.2,
  "timestamp": 1726644978
}
```

  - All 4 required sensor fields must always be present — `ammonia`, `methane`, `humidity`, `temperature`.
  - `device_id` is always the literal string `"G3036"` for this phase (matches the old simulator's value — zero downstream impact, no dashboard/controller changes needed).
  - `timestamp` is Unix epoch seconds, set by the mimic device (mirrors what the real device would set).
  - `mqtt-bridge/` is responsible for adding `created_at` (a proper Mongo `Date`, set at insert time) before writing to `G3036` — this field is NOT published over MQTT, consistent with how the Phase 2 simulator set it locally at insert time.

### Device Simulation — Mimic Device (Phase 3, NEW — replaces Phase 2 simulator)

- New top-level folder: `mimic-device/` (Python, standalone process, separate from `server/`, `client/`, and `mqtt-bridge/`)
- Publishes JSON payloads (see contract above) to `prohori/G3036/reading` on an interval (~60s, matching the old simulator's cadence)
- Values should random-walk within realistic ranges (occasionally drifting into warning/danger zones per the threshold table below) for a believable demo — same random-walk philosophy as the old `simulator/`, just publishing over MQTT instead of writing to Mongo directly
- Reads broker connection details from its own `mimic-device/.env` (see env vars below) — never hardcode credentials
- **Single mimic device only** for this phase. Do not build multi-device/concurrent publishing yet — that's deferred.
- The old `simulator/` folder is retired/deprecated once `mimic-device/` + `mqtt-bridge/` are verified working end-to-end. Do not delete it until that verification is complete; do not extend or modify it further.

### MQTT Bridge (Phase 3, NEW — the sole writer to `G3036` going forward)

- New top-level folder: `mqtt-bridge/` (Python, standalone process, separate from `server/`, `client/`, and `mimic-device/`)
- Subscribes to `prohori/G3036/reading` via `paho-mqtt`
- On each message: parses the JSON payload, validates it matches the expected shape, adds `created_at` (current time, proper Mongo `Date`), and inserts into `iotdb.G3036` via `pymongo` — matching the exact schema below, byte-for-byte compatible with what `server/src/models/Reading.js` expects
- **This becomes the only writer to `G3036`** — `mimic-device/` never touches MongoDB directly, only publishes to MQTT. `server/` remains fully read-only, unchanged from Phase 1/2.
- Reads both MQTT broker details and `MONGO_URI` from its own `mqtt-bridge/.env` — never hardcode, never commit `.env`
- Should log connection state changes (connect/disconnect/reconnect) and any malformed/rejected payloads, since this is the newest, least-proven part of the pipeline
- Reconnect behavior: on MQTT disconnect, should attempt to reconnect rather than crash (mirrors the resilience pattern already used in `server/src/sockets/changeStream.js` for Change Stream errors)

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend (Phase 2, implemented, unchanged)
- MongoDB Change Streams — detects new inserts into `G3036` (Phase 2, implemented, unchanged)
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Mimic Device (Phase 3, NEW)**
- Python (`paho-mqtt`) — standalone script, publishes synthetic sensor readings to the MQTT broker on an interval. Does NOT talk to MongoDB.

**MQTT Bridge (Phase 3, NEW)**
- Python (`paho-mqtt` + `pymongo`) — standalone script, subscribes to the mimic device's topic, transforms payloads, and is the sole writer to `G3036`. Replaces the old `simulator/`'s writer role.

**Database**
- MongoDB Atlas (existing cluster)
- Database: `iotdb`, Collection: `G3036`
- Note: the Atlas cluster also contains several unrelated per-device collections (e.g. `G3007`, `G3009`, `G3017`, `G3029`, `G3035`, each with sibling `_EVENTS`/`_LOG` collections) belonging to other real devices/products. **Our app only ever reads/writes `G3036`** (hardcoded in `Reading.js`) — the other collections are out of scope and intentionally invisible to this dashboard.
- **Read-only from `server/`** — never write, update, or delete documents in this collection from the API layer; only `mqtt-bridge/` writes (Phase 3 onward; was `simulator/` in Phase 2)

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing (implemented — three routes: `/`, `/history`, `/calendar`)
- Tailwind CSS — utility-first styling, implementing the Stitch design system (tokens live in `client/src/index.css` under `@theme`, matching `DESIGN.md`)
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates (implemented, unchanged by Phase 3)
- axios — HTTP client for calling the backend API

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
  timestamp: Number,       // Unix epoch seconds, set by device/mimic device
  created_at: Date         // ISODate, set by DB insert (mqtt-bridge in Phase 3) — use this for sorting/filtering, not `timestamp`
}
```

Rules:
- Never invent fields that aren't in this schema.
- `server/` never writes/inserts/updates documents in this collection — read-only. Only `mqtt-bridge/` writes (Phase 3 onward), matching this exact schema.
- Use `created_at` (not `timestamp`) for all date range queries, sorting, and aggregation grouping, since it's a proper Mongo Date type.
- Connection string lives in `mqtt-bridge/.env` as `MONGO_URI` — never hardcode it, never commit `.env`. `server/.env` also keeps its own `MONGO_URI` for reads (both point at the same Atlas cluster).

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
│   │   │   └── changeStream.js    # Watches G3036 via Change Streams, emits `new-reading` via Socket.IO
│   │   └── app.js                 # Express app setup: middleware, routes, CORS, Socket.IO server, starts the server
│   ├── .env                       # MONGO_URI, PORT, CLIENT_ORIGIN — gitignored, never commit
│   ├── .env.example
│   └── package.json
│
├── mimic-device/                  # Phase 3 NEW: publishes fake sensor readings over MQTT (does not touch MongoDB)
│   ├── mimic_device.py            # Main loop: generate a reading, publish JSON to prohori/G3036/reading on an interval
│   ├── .env                       # MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS — gitignored, never commit
│   ├── .env.example
│   └── requirements.txt
│
├── mqtt-bridge/                   # Phase 3 NEW: subscribes to MQTT, writes into G3036 — the sole writer to G3036
│   ├── mqtt_bridge.py             # Subscribes to prohori/G3036/reading, transforms payload, inserts into MongoDB
│   ├── .env                       # MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS, MONGO_URI — gitignored, never commit
│   ├── .env.example
│   └── requirements.txt
│
├── simulator/                     # DEPRECATED (Phase 2) — direct-to-Mongo writer, being replaced by mimic-device/ + mqtt-bridge/
│   ├── simulate_device.py         # Do not modify or extend further. Retire once Phase 3 pipeline is verified working.
│   ├── .env
│   ├── .env.example
│   └── requirements.txt
│
├── client/                        # React (Vite) frontend — the dashboard UI (UNCHANGED by Phase 3)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── Header.jsx
│   │   │   ├── dashboard/
│   │   │   │   ├── SensorCard.jsx
│   │   │   │   ├── ReadingsPanel.jsx
│   │   │   │   ├── HistoryTable.jsx
│   │   │   │   ├── HistoryTabs.jsx
│   │   │   │   └── TrendChart.jsx
│   │   │   ├── calendar/
│   │   │   │   ├── CalendarGrid.jsx
│   │   │   │   └── DayDetailCards.jsx
│   │   │   └── common/
│   │   │       └── StatusBadge.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── History.jsx
│   │   │   └── Calendar.jsx
│   │   ├── hooks/
│   │   │   ├── useLatestReading.js
│   │   │   ├── useReadingsHistory.js
│   │   │   ├── useReadingsLog.js
│   │   │   ├── useCalendarData.js
│   │   │   ├── useDayDetail.js
│   │   │   └── useDeviceStatus.js
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   ├── .env.example
│   └── package.json
│
├── AGENTS.md                      # This file — stack, schema, conventions, folder guide
├── PAGES.md                       # Screen/section breakdown for the current phase
├── DESIGN.md                      # Stitch design output translated into design tokens/specs
└── README.md                      # Setup instructions, how to run server + client + mimic-device + mqtt-bridge locally
```

**Why this structure (Phase 3 additions):**
- `mimic-device/` and `mqtt-bridge/` are two separate processes, not one, deliberately mirroring how the real device and the real bridge would eventually be separate: a device publishes data, a bridge (or the device itself, for real hardware) writes it to storage. Keeping them separate now means swapping `mimic-device/` for the real physical device later requires **zero changes to `mqtt-bridge/`** — the bridge doesn't know or care whether it's receiving mimic data or real data, only that the topic/payload contract is honored.
- `mqtt-bridge/` — not `mimic-device/` — is the one that touches MongoDB, preserving the "single writer to `G3036`" rule established in Phase 2 (previously enforced by `simulator/` alone).
- `simulator/` is left in place but frozen/deprecated rather than deleted immediately, in case the Phase 3 pipeline needs a fallback during verification.

## API Contract (unchanged by Phase 3)

- `GET /api/readings/latest` → single most recent document + zone classifications
- `GET /api/readings/daily-averages?range=7d|30d` → array of `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }`
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }`
- `GET /api/readings/calendar?month=YYYY-MM` → array of per-day min/max + independently classified zones
- `GET /api/readings/day/:date` → full min/max detail for one day
- `GET /health` → `{ status: "ok" }`
- **Socket.IO event:** `new-reading` → emitted on each new insert into `G3036` (via Change Streams)

None of these change for Phase 3 — the API layer has no idea whether `G3036` was written to by the old simulator, the new MQTT bridge, or eventually the real device. This is the entire point of the "single writer, fixed schema" design from Phase 2.

**Still-open question, unrelated to Phase 3:** `GET /api/readings/history?range=7d|30d` (raw readings, Phase 1) still exists server-side and is still callable, but nothing in the frontend calls it anymore. Deprecation decision still pending.

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only.
- **Env vars:**
  - `server/.env`: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`
  - `client/.env`: `VITE_API_URL`
  - `mimic-device/.env` (Phase 3 NEW): `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`
  - `mqtt-bridge/.env` (Phase 3 NEW): `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`, `MONGO_URI`
  - MQTT credentials (broker host/port/user/pass) are **never hardcoded** in any script and **never committed** — always loaded via `.env`, same rule as `MONGO_URI`. Only `.env.example` files (placeholder values) are committed.
- Keep components/scripts small and single-purpose (one card = one component, one hook = one data concern, one Python script = one process's job).
- Tailwind design tokens live in `client/src/index.css` under `@theme`, mirroring `DESIGN.md`.
- **Document before build:** this file, `PAGES.md`, and `DESIGN.md` are updated at the start of each phase, before any code is written. Phase 3's topic/payload contract above must be treated as fixed and confirmed before `mimic-device/` or `mqtt-bridge/` code is generated — do not guess field names or topic paths.

## Threshold / Alert Logic (ACTIVE — unchanged since Phase 1)

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

- Zone classification remains computed **server-side** (`server/src/utils/thresholds.js`) — untouched by Phase 3. `mimic-device/`'s random-walk generator should aim to occasionally drift into warning/danger ranges per this table, for a believable demo (same philosophy as the old simulator).

## Known Temporary Workarounds (Still Open — Unrelated to Phase 3)

- **Cutoffs**: `getHistory`/`getDailyAverages` still use document-count `.limit()` windowing instead of a genuine `Date.now()`-relative `$gte` filter. Once Phase 3's mimic device (and eventually the real device) has been running continuously for a while, revisit whether this is still needed.
- **UTC day-boundary grouping**: `getDailyAverages` groups by `$dateToString` with no explicit timezone, so grouping is in UTC — may misalign day boundaries for a Bangladesh-based (UTC+6) user. Still unverified.
- Search `TODO(revert-for-production)` in `readingsController.js` for exact spots.

## Out of Scope for This Phase

- Multi-device / concurrent mimic devices (explicitly deferred — single mimic device only for this pass of Phase 3)
- Push/email/SMS notifications for alerts
- Authentication/user accounts
- Any endpoint that writes to `G3036` from `server/` (writes remain `mqtt-bridge/`'s job only)
- Using the real physical device / real broker topics (`farm_controller/...`) — deferred until the supervisor confirms the device is back online and confirms/adds ammonia+methane publishing

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts — current readings, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator (direct-to-Mongo writer), daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.
- **Phase 3 (IN PROGRESS)**: Replacing the direct-to-Mongo simulator with a real MQTT pipeline: a single `mimic-device/` publishes synthetic readings over MQTT to `prohori/G3036/reading`, and a new `mqtt-bridge/` subscribes and becomes the sole writer to `G3036`, replacing `simulator/`. Chosen because the real physical device/broker topics are currently offline and don't yet publish ammonia/methane. Multi-device support explicitly deferred to a later phase. No changes required to `server/`, `client/`, Change Streams, or Socket.IO — the entire point of the fixed schema/single-writer design from Phase 2.