# Prohori MQTT Bridge

This standalone process subscribes to `prohori/+/reading`, validates incoming JSON readings against the seeded devices in `iotdb.devices`, and routes each message into its matching MongoDB collection (`iotdb.<deviceId>`). It is the sole writer for reading collections; the API server remains read-only.

## Hard single-writer rule

**Never run `simulator/` at the same time as `mqtt-bridge/`.** Stop `simulator/` before starting this bridge.

## Security & Filtering

- **Dynamic Device Registry**: The bridge loads allowed device IDs from `iotdb.devices` on startup and refreshes every 60s.
- **Topic-derived Device ID**: The collection name and document `device_id` are strictly derived from the MQTT topic (`prohori/<deviceId>/reading`).
- **Unknown Device Rejection**: Messages targeting device IDs not present in `iotdb.devices` (e.g. `G3039` or `G9999`) are dropped, logged as warnings, and never create a new collection.

## Setup

Copy `.env.example` to `.env` and fill in the MQTT credentials and `MONGO_URI`. Keep `.env` private and never commit it.

Install dependencies and run from this folder:

```text
pip install -r requirements.txt
python bridge.py
```

The bridge subscribes at QoS 1, logs rejected payloads without stopping, and automatically retries MQTT connections after disconnects. `created_at` is assigned by the bridge using the current UTC time.
