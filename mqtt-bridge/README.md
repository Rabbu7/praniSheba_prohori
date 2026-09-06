# Prohori MQTT Bridge

This standalone Phase 3 process subscribes to `prohori/G3036/reading`, validates incoming JSON readings, and inserts them into the MongoDB collection `iotdb.G3036`. It is the sole writer for `G3036`; the API server remains read-only.

## Hard single-writer rule

**Never run `simulator/` at the same time as `mqtt-bridge/`.** The old simulator writes directly to `G3036`, while this bridge writes readings received from MQTT. Running both pipelines together can create duplicate or conflicting data. Stop `simulator/` before starting this bridge.

This bridge only subscribes to the configured MQTT topic and only writes to `iotdb.G3036`. It does not provide an HTTP server, Socket.IO service, or writes to any other collection.

## Setup

Copy `.env.example` to `.env` and fill in the MQTT credentials and `MONGO_URI`. Keep `.env` private and never commit it.

Install dependencies and run from this folder:

```text
pip install -r requirements.txt
python bridge.py
```

The bridge subscribes at QoS 1, logs rejected payloads without stopping, and automatically retries MQTT connections after disconnects. `created_at` is assigned by the bridge using the current UTC time; it is never trusted from the MQTT payload.
