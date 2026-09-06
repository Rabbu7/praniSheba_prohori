# AGENTS.md

> Instructions for AI coding agents (GitHub Copilot, Antigravity, etc.) working on this repository.
> This file is updated at the start of every new phase. Always re-read it before starting work in a new session.

## Project

**Prohori Dashboard** — internal internship project for Adorsho Pranisheba, building a monitoring dashboard for the "Prohori" cowshed IoT sensor product (ammonia, methane, humidity, temperature).

Reference product: https://iot.pranisheba.com.bd/#/home
Company site: https://www.pranisheba.com.bd/-eng

## Current Phase: Phase 3 (COMPLETE — verified end-to-end including frontend)

Phase 3 replaces the Phase 2 Python simulator (which wrote directly to MongoDB) with a **live MQTT pipeline**, since the goal is to eventually consume real device data over MQTT rather than direct DB writes.

### Decision: `farm_controller/CATTLE_CTRL_001/event` is abandoned — not our device

During broker investigation, `farm_controller/CATTLE_CTRL_001/event` was explored as a candidate real-device topic. It was **abandoned as a dead end**, not merely deferred:

- It belongs to a different, unrelated device/system on the shared broker — not the Prohori/G3036 hardware.
- It never published `ammonia`/`methane` and only exposed `temperature`, `humidity`, and an unexplained `thi` field.
- The device showed `offline` status and its payload was a stale **retained** message — there is no live control or understanding of that device from this project.
- Waiting on this topic was blocking Phase 3 for no reason: it was never going to be our data source, real or fake.

**Resolution:** stop pursuing this topic entirely. It should not be referenced, subscribed to, or investigated further in this project. If the physical Prohori device eventually ships, it will publish to **our own topic** (`prohori/G3036/reading`, see below), not to `farm_controller/...`.

### Phase 3 Architecture — VERIFIED WORKING END-TO-END (Stage 9c)

```
mimic-device/ (Python, paho-mqtt)
      │  publishes realistic fake readings on an interval — SEMI-PERMANENT stand-in
      │  for the physical device, run continuously during Phase 3 dev/demos
      ▼
MQTT Broker (152.42.179.228:1885, user "apsIoT") — REAL broker, real credentials
      │  topic: prohori/G3036/reading  (our own topic, not shared with any other device)
      ▼
mqtt-bridge/ (Python, paho-mqtt subscriber + pymongo) — VERIFIED, Stage 9c
      │  parses payload, validates shape, adds created_at, inserts
      ▼
MongoDB Atlas — iotdb.G3036
      │  Change Streams (existing, unchanged)
      ▼
server/ (Socket.IO `new-reading` event — existing, unchanged)
      ▼
client/ dashboard (existing, unchanged — CONFIRMED: live Socket.IO delivery from this pipeline verified working smoothly in-browser)
```

**Key point:** everything downstream of `G3036` (Change Streams → Socket.IO → frontend) required **zero changes** for Phase 3, exactly as designed. `mimic-device` + `mqtt-bridge` together are now the writer, replacing `simulator/`, using the exact same `device_id` (`"G3036"`) and schema the old simulator used.

**`mimic-device` is not a throwaway test tool — it is the de facto Prohori device for the rest of Phase 3.** It runs continuously against the **real broker** (not a local test broker) and stands in for the physical hardware until that hardware exists. When the physical device eventually ships, it only needs to publish the same 4-field payload to the same topic (`prohori/G3036/reading`) — no other code changes.

### ⚠️ Single-writer rule — CRITICAL, now ACTIVELY ENFORCED

`simulator/` (direct-to-Mongo writer) and the `mimic-device → mqtt-bridge → G3036` pipeline **must never run at the same time.** Running both concurrently violates the single-writer rule and will corrupt or duplicate data in `G3036`.

- **`mqtt-bridge/` is now verified working end-to-end (Stage 9c, confirmed via live logs + MongoDB Compass) and is the sole writer to `G3036` going forward.**
- **`simulator/` is retired as of Stage 9c.** It is not deleted (kept as an emergency fallback), but it must not be run under any circumstances while `mimic-device`/`mqtt-bridge` are active. Treat it as frozen — do not modify or extend it further.
- Before starting a dev/demo session, confirm which pipeline is active — always start `mimic-device` + `mqtt-bridge` together, never `simulator/` alongside them.
- Normal dev/demo workflow going forward is **two terminals**: one running `mimic-device/publisher.py`, one running `mqtt-bridge/bridge.py`, both against the real broker.

### MQTT Topic & Payload Contract (CONFIRMED — source of truth for Phase 3)

- **Broker:** `152.42.179.228`, port `1885`
- **Auth:** username `apsIoT`, password via env var (never hardcoded — see Conventions)
- **Topic:** `prohori/G3036/reading` — our own topic, deliberately distinct from any other device's topic on the shared broker (including the abandoned `farm_controller/...` topic)
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

  - All 4 required sensor fields are always present — `ammonia`, `methane`, `humidity`, `temperature`. (No missing-field problem — that only ever existed with the abandoned `farm_controller` topic.)
  - `device_id` is always the literal string `"G3036"` for this phase (matches the old simulator's value — zero downstream impact, no dashboard/controller changes needed).
  - `timestamp` is Unix epoch seconds, set by the mimic device (mirrors what the real device would set).
  - `mqtt-bridge/` adds `created_at` (a proper Mongo `Date`, set at insert time) before writing to `G3036` — this field is NOT published over MQTT, consistent with how the Phase 2 simulator set it locally at insert time. **Verified in Stage 9c**: Compass documents show `created_at` as a fresh `ISODate` distinct from and slightly after the payload's `timestamp`, confirming the bridge sets it correctly rather than trusting the wire.
  - Messages are published **non-retained**, QoS 1 — the bridge does not rely on retained/stale messages the way the abandoned `farm_controller` topic did.

### Device Simulation — Mimic Device (Phase 3 — semi-permanent stand-in, VERIFIED)

- Top-level folder: `mimic-device/` (Python, standalone process, separate from `server/`, `client/`, and `mqtt-bridge/`)
- Publishes JSON payloads (see contract above) to `prohori/G3036/reading` on a 60-second interval — **against the real broker**, for all Phase 3 dev/demo work going forward
- Values random-walk within realistic ranges (occasionally drifting into warning/danger zones per the threshold table below) for a believable demo
- Reads broker connection details from its own `mimic-device/.env` (see env vars below) — never hardcode credentials
- `generator.py` (random-walk logic) and `publisher.py` (MQTT publish loop) are both complete and verified:
  - Stage 9a: `generator.py` output verified via `run_local_test.py`
  - Stage 9b: `publisher.py` verified end-to-end against a local Mosquitto broker
  - **Stage 9c: verified running continuously against the real broker (`152.42.179.228:1885`), feeding `mqtt-bridge/` successfully**
- **Single mimic device only** for this phase. Do not build multi-device/concurrent publishing yet — that's deferred.
- The old `simulator/` folder is now retired (see single-writer rule above). Do not delete it yet; do not extend or modify it further; **do not run it concurrently with the MQTT pipeline.**

### MQTT Bridge (Phase 3, VERIFIED — sole writer to `G3036`)

- Top-level folder: `mqtt-bridge/` (Python, standalone process, separate from `server/`, `client/`, and `mimic-device/`)
- Subscribes to `prohori/G3036/reading` via `paho-mqtt` (v2 API, `CallbackAPIVersion.VERSION2`) on the real broker
- On each message: parses the JSON payload, validates it matches the expected shape (all 4 sensor fields present, correct numeric types, non-empty `device_id`, integer `timestamp`), adds `created_at` (current UTC time, proper Mongo `Date`), and inserts into `iotdb.G3036` via `pymongo` — matching the exact schema in `server/src/models/Reading.js` field-for-field
- **Confirmed as the sole writer to `G3036`** — `mimic-device/` never touches MongoDB directly, only publishes to MQTT. `server/` remains fully read-only, unchanged from Phase 1/2.
- Reads both MQTT broker details and `MONGO_URI` from its own `mqtt-bridge/.env` — never hardcoded, never committed
- Logs connection state changes (connect/subscribe/disconnect) and any malformed/rejected payloads (validation failures are logged and skipped, never crash the process)
- Reconnect behavior implemented via `paho-mqtt`'s built-in `reconnect_delay_set`, mirroring the resilience pattern already used in `server/src/sockets/changeStream.js` for Change Stream errors
- **Stage 9c acceptance test PASSED**: ran `mimic-device/publisher.py` and `mqtt-bridge/bridge.py` concurrently against the real broker; confirmed matching payloads across publisher log, bridge log, and MongoDB Compass (`iotdb.G3036`) for multiple consecutive cycles; confirmed `created_at` is freshly assigned per document at insert time.
- **Closed:** live Socket.IO delivery to `client/` from this pipeline (mimic-device → mqtt-bridge → Change Streams → Socket.IO → dashboard) has been visually confirmed in-browser, running smoothly. No frontend code changes were needed, as expected — this was the entire point of the "single writer, fixed schema" design.

## Stack

**Backend**
- Node.js + Express — REST API server
- Mongoose — MongoDB object modeling / query layer
- Socket.IO — real-time push to frontend (Phase 2, implemented, unchanged)
- MongoDB Change Streams — detects new inserts into `G3036` (Phase 2, implemented, unchanged)
- dotenv — environment variable loading
- cors — allow requests from the frontend origin

**Mimic Device (Phase 3, verified working end-to-end)**
- Python (`paho-mqtt`) — standalone script, publishes synthetic sensor readings to the real MQTT broker on an interval. Does NOT talk to MongoDB. Runs continuously as a stand-in for the physical device.

**MQTT Bridge (Phase 3, verified working end-to-end)**
- Python (`paho-mqtt` + `pymongo`) — standalone script, subscribes to `prohori/G3036/reading` on the real broker, validates and transforms payloads, and is the sole writer to `G3036`. Replaces the old `simulator/`'s writer role.

**Database**
- MongoDB Atlas (existing cluster)
- Database: `iotdb`, Collection: `G3036`
- Note: the Atlas cluster also contains several unrelated per-device collections (e.g. `G3007`, `G3009`, `G3017`, `G3029`, `G3035`, each with sibling `_EVENTS`/`_LOG` collections) belonging to other real devices/products. **Our app only ever reads/writes `G3036`** (hardcoded in `Reading.js`) — the other collections are out of scope and intentionally invisible to this dashboard.
- **Read-only from `server/`** — never write, update, or delete documents in this collection from the API layer; only `mqtt-bridge/` writes (Phase 3 onward; was `simulator/` in Phase 2, now retired). Never both at once — see single-writer rule above.

**Frontend**
- React (Vite) — SPA framework/build tool
- react-router-dom — client-side routing (implemented — three routes: `/`, `/history`, `/calendar`)
- Tailwind CSS — utility-first styling, implementing the Stitch design system (tokens live in `client/src/index.css` under `@theme`, matching `DESIGN.md`)
- Recharts — trend/daily-average charts
- Socket.IO client — real-time updates (implemented, unchanged by Phase 3; confirmed working live against the new MQTT pipeline)
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
  created_at: Date         // ISODate, set by DB insert (mqtt-bridge, Phase 3 onward) — use this for sorting/filtering, not `timestamp`
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
├── mimic-device/                  # Phase 3: publishes fake sensor readings over MQTT — semi-permanent
│   │                               # stand-in for the physical device, runs against the REAL broker.
│   │                               # Does not touch MongoDB. VERIFIED end-to-end (Stage 9c).
│   ├── generator.py               # Pure random-walk reading generator logic (verified working, Stage 9a)
│   ├── publisher.py               # MQTT publish loop — connects, publishes on interval, clean shutdown (verified, Stage 9b/9c)
│   ├── run_local_test.py          # Manual console test for generator.py output (no MQTT)
│   ├── .env                       # MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS, MQTT_TOPIC, DEVICE_ID,
│   │                               # PUBLISH_INTERVAL_SECONDS — gitignored, never commit. Points at the
│   │                               # REAL broker for normal use (152.42.179.228:1885).
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
│
├── mqtt-bridge/                   # Phase 3: subscribes to MQTT, writes into G3036 — the sole writer to G3036
│   │                               # VERIFIED end-to-end (Stage 9c) against the real broker + real Atlas cluster.
│   ├── bridge.py                  # Subscribes to prohori/G3036/reading, validates + transforms payload, inserts into MongoDB
│   ├── .env                       # MQTT_HOST, MQTT_PORT, MQTT_USER, MQTT_PASS, MQTT_TOPIC, MONGO_URI — gitignored, never commit
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
│
├── simulator/                     # RETIRED (Phase 2) — direct-to-Mongo writer, replaced by mimic-device/ + mqtt-bridge/
│   ├── simulate_device.py         # Do not modify or extend further. Must NEVER run concurrently with the MQTT pipeline.
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

**Why this structure (Phase 3):**
- `mimic-device/` and `mqtt-bridge/` are two separate processes, not one, deliberately mirroring how the real device and the real bridge would eventually be separate: a device publishes data, a bridge (or the device itself, for real hardware) writes it to storage. Keeping them separate now means swapping `mimic-device/` for the real physical device later requires **zero changes to `mqtt-bridge/`** — the bridge doesn't know or care whether it's receiving mimic data or real data, only that the topic/payload contract is honored.
- `mqtt-bridge/` — not `mimic-device/` — is the one that touches MongoDB, preserving the "single writer to `G3036`" rule established in Phase 2 (previously enforced by `simulator/` alone, now enforced by `mqtt-bridge/` alone).
- `simulator/` is left in place but frozen/retired rather than deleted immediately, in case the Phase 3 pipeline needs a fallback — but it must never run at the same time as the MQTT pipeline. This rule is now actively load-bearing, not theoretical, since both pipelines are functional.

## API Contract (unchanged by Phase 3)

- `GET /api/readings/latest` → single most recent document + zone classifications
- `GET /api/readings/daily-averages?range=7d|30d` → array of `{ date, ammonia_avg, methane_avg, humidity_avg, temperature_avg, ...zones }`
- `GET /api/readings/log?page=&limit=` → `{ data, page, limit, total, totalPages }`
- `GET /api/readings/calendar?month=YYYY-MM` → array of per-day min/max + independently classified zones
- `GET /api/readings/day/:date` → full min/max detail for one day
- `GET /health` → `{ status: "ok" }`
- **Socket.IO event:** `new-reading` → emitted on each new insert into `G3036` (via Change Streams)

None of these change for Phase 3 — the API layer has no idea whether `G3036` was written to by the old simulator, the new MQTT bridge, or eventually the real device. This is the entire point of the "single writer, fixed schema" design from Phase 2, and Stage 9c's Compass verification confirms it's holding up in practice.

**Still-open question, unrelated to Phase 3:** `GET /api/readings/history?range=7d|30d` (raw readings, Phase 1) still exists server-side and is still callable, but nothing in the frontend calls it anymore. Deprecation decision still pending.

## Conventions

- Backend: standard Express controller/route separation, async/await with try/catch, centralized error middleware, no business logic inside route files.
- Frontend: functional components + hooks only, no class components. Styling via Tailwind utility classes only.
- **Env vars:**
  - `server/.env`: `MONGO_URI`, `PORT`, `CLIENT_ORIGIN`
  - `client/.env`: `VITE_API_URL`
  - `mimic-device/.env`: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`, `MQTT_TOPIC`, `DEVICE_ID`, `PUBLISH_INTERVAL_SECONDS` — points at the **real broker** (`152.42.179.228:1885`) for normal Phase 3 use
  - `mqtt-bridge/.env`: `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASS`, `MQTT_TOPIC`, `MONGO_URI` — also points at the real broker; `MONGO_URI` points at the same Atlas cluster `server/.env` uses
  - MQTT credentials (broker host/port/user/pass) are **never hardcoded** in any script and **never committed** — always loaded via `.env`, same rule as `MONGO_URI`. Only `.env.example` files (placeholder values) are committed.
- Keep components/scripts small and single-purpose (one card = one component, one hook = one data concern, one Python script = one process's job).
- Tailwind design tokens live in `client/src/index.css` under `@theme`, mirroring `DESIGN.md`.
- **Document before build:** this file, `PAGES.md`, and `DESIGN.md` are updated at the start of each phase, before any code is written. Phase 3's topic/payload contract above is fixed, confirmed, and now empirically verified end-to-end — do not guess field names or topic paths, and do not resurrect `farm_controller/...` as a data source.

## Threshold / Alert Logic (ACTIVE — unchanged since Phase 1)

| Metric | Safe Zone | Warning Zone | Danger Zone |
|---|---|---|---|
| Ammonia (NH₃, ppm) | 0–10 | 10–25 | Above 25 |
| Methane (CH₄, ppm) | 10–1,000 | 1,000–5,000 | Above 50,000 (5% air, explosion risk) |
| Humidity (%) | 50–70% | 40–50% or 70–80% | Below 40% or above 80% |
| Temperature (°F) | 40–68°F | 25–40°F or 68–79°F | Below 25°F or above 79°F |

- Zone classification remains computed **server-side** (`server/src/utils/thresholds.js`) — untouched by Phase 3. `mimic-device/`'s random-walk generator aims to occasionally drift into warning/danger ranges per this table, for a believable demo (same philosophy as the old simulator).

## Known Temporary Workarounds (Still Open — Unrelated to Phase 3)

- **Cutoffs**: `getHistory`/`getDailyAverages` still use document-count `.limit()` windowing instead of a genuine `Date.now()`-relative `$gte` filter. Now that the MQTT pipeline is running continuously (Stage 9c onward), this should be revisited soon — worth confirming a few days of continuous real data before removing the workaround.
- **UTC day-boundary grouping**: `getDailyAverages` groups by `$dateToString` with no explicit timezone, so grouping is in UTC — may misalign day boundaries for a Bangladesh-based (UTC+6) user. Still unverified.
- Search `TODO(revert-for-production)` in `readingsController.js` for exact spots.

## Out of Scope for This Phase

- Multi-device / concurrent mimic devices (explicitly deferred — single mimic device only for this pass of Phase 3)
- Push/email/SMS notifications for alerts
- Authentication/user accounts
- Any endpoint that writes to `G3036` from `server/` (writes remain `mqtt-bridge/`'s job only)
- Any further investigation of `farm_controller/CATTLE_CTRL_001/event` or other unrelated broker topics — abandoned, not our device

## Phase History

- **Phase 1**: Read-only single-device dashboard, polling-based updates, threshold-based visual alerts — current readings, 7d/30d history, chart.
- **Phase 2 (COMPLETE)**: Real-time via Socket.IO + Change Streams, Python device simulator (direct-to-Mongo writer), daily-average charting, unbounded reading log moved to its own page, calendar min/max view. Three routed pages instead of one.
- **Phase 3 (COMPLETE)**: Replaced the direct-to-Mongo simulator with a real MQTT pipeline. Initial investigation of the real device broker topic (`farm_controller/CATTLE_CTRL_001/event`) was **abandoned** — it belonged to an unrelated device, was missing required fields, and was publishing stale retained data. `mimic-device/` (Stages 9a–9b) became the semi-permanent stand-in device, publishing well-formed payloads to our own topic (`prohori/G3036/reading`) on the real broker. **Stage 9c built and verified `mqtt-bridge/`** — subscribes to that topic and is the confirmed sole writer to `G3036`, replacing `simulator/` (now retired). End-to-end verification (publisher log ↔ bridge log ↔ MongoDB Compass) passed for multiple consecutive cycles, including correct `created_at` assignment. **Live Socket.IO delivery to the dashboard from this new pipeline has also been visually confirmed** — Change Streams and Socket.IO code required zero changes, exactly as the Phase 2 architecture intended. `simulator/` must never run concurrently with the MQTT pipeline going forward; normal dev/demo workflow is two terminals (`mimic-device/publisher.py` + `mqtt-bridge/bridge.py`) run together against the real broker. Ready for supervisor demo.