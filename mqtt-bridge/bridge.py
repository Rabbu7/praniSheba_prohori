"""Bridge Prohori MQTT readings into per-device MongoDB collections."""

import json
import logging
import math
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database


LOGGER = logging.getLogger("mqtt-bridge")
CONNECT_TIMEOUT_MS = 10_000
REQUIRED_ENV_VARS = (
    "MQTT_HOST",
    "MQTT_PORT",
    "MQTT_USER",
    "MQTT_PASS",
    "MQTT_TOPIC",
    "MONGO_URI",
)
REQUIRED_FIELDS = (
    "device_id",
    "ammonia",
    "methane",
    "humidity",
    "temperature",
    "timestamp",
)
NUMERIC_FIELDS = ("ammonia", "methane", "humidity", "temperature")


class DeviceRegistry:
    """Manages allowed device IDs loaded dynamically from MongoDB iotdb.devices."""

    def __init__(self, db: Database, refresh_interval: float = 60.0):
        self.db = db
        self.refresh_interval = refresh_interval
        self._allowed_ids: set[str] = set()
        self._last_refresh: float = 0.0
        self._lock = threading.Lock()
        self.refresh()

    def refresh(self) -> set[str]:
        """Fetch valid device IDs from iotdb.devices collection."""
        try:
            docs = self.db["devices"].find({}, {"deviceId": 1})
            ids = {
                doc["deviceId"]
                for doc in docs
                if "deviceId" in doc and isinstance(doc["deviceId"], str) and doc["deviceId"].strip()
            }
            with self._lock:
                self._allowed_ids = ids
                self._last_refresh = time.time()
            LOGGER.info("Refreshed allowed device IDs from DB (%d devices): %s", len(ids), sorted(list(ids)))
            return ids
        except Exception:
            LOGGER.exception("Failed to refresh allowed device IDs from DB")
            with self._lock:
                return self._allowed_ids

    def is_allowed(self, device_id: str) -> bool:
        """Check if device_id is in allowed set, refreshing if interval expired."""
        now = time.time()
        if now - self._last_refresh >= self.refresh_interval:
            self.refresh()
        with self._lock:
            return device_id in self._allowed_ids


def load_config() -> dict:
    """Load and validate bridge settings from mqtt-bridge/.env."""
    load_dotenv(Path(__file__).with_name(".env"))

    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    try:
        port = int(os.environ["MQTT_PORT"])
    except ValueError as error:
        raise ValueError("MQTT_PORT must be an integer") from error

    if not 1 <= port <= 65535:
        raise ValueError("MQTT_PORT must be between 1 and 65535")

    return {
        "mqtt_host": os.environ["MQTT_HOST"],
        "mqtt_port": port,
        "mqtt_user": os.environ["MQTT_USER"],
        "mqtt_pass": os.environ["MQTT_PASS"],
        "mqtt_topic": os.environ["MQTT_TOPIC"],
        "mongo_uri": os.environ["MONGO_URI"],
    }


def extract_device_id_from_topic(topic: str) -> str | None:
    """Extract device_id from topic pattern prohori/<deviceId>/reading."""
    parts = topic.split("/")
    if len(parts) == 3 and parts[0] == "prohori" and parts[2] == "reading" and parts[1].strip():
        return parts[1].strip()
    return None


def validate_payload(payload: object) -> tuple[dict | None, str | None]:
    """Return the allowlisted reading fields or a reason for rejection."""
    if not isinstance(payload, dict):
        return None, "payload must be a JSON object"

    missing = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        return None, f"missing required field(s): {', '.join(missing)}"

    for field in NUMERIC_FIELDS:
        value = payload[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            return None, f"{field} must be a finite number"

    timestamp = payload["timestamp"]
    if isinstance(timestamp, bool) or not isinstance(timestamp, (int, float)) or not math.isfinite(timestamp):
        return None, "timestamp must be a numeric Unix epoch value"

    return {field: payload[field] for field in REQUIRED_FIELDS}, None


def parse_message(raw_payload: bytes) -> tuple[dict | None, str | None]:
    """Decode and validate one MQTT payload without raising to the callback."""
    try:
        payload = json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        return None, f"invalid JSON: {error}"

    return validate_payload(payload)


def create_mongo_client(mongo_uri: str) -> tuple[MongoClient, Database]:
    """Connect to MongoDB and return the client and iotdb database."""
    mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=CONNECT_TIMEOUT_MS)
    mongo_client.admin.command("ping")
    db = mongo_client.get_database()
    if db.name != "iotdb":
        db = mongo_client["iotdb"]
    return mongo_client, db


def create_mqtt_client(config: dict, db: Database, registry: DeviceRegistry) -> mqtt.Client:
    """Create an authenticated MQTT v2 client with reconnect behavior."""
    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.username_pw_set(config["mqtt_user"], config["mqtt_pass"])
    client.reconnect_delay_set(min_delay=1, max_delay=60)

    def on_connect(_client, _userdata, _flags, reason_code, _properties):
        if reason_code.is_failure:
            LOGGER.error("MQTT connection failed: %s", reason_code)
            return

        LOGGER.info("Connected to MQTT broker at %s:%s", config["mqtt_host"], config["mqtt_port"])
        result, _mid = _client.subscribe(config["mqtt_topic"], qos=1)
        if result != mqtt.MQTT_ERR_SUCCESS:
            LOGGER.error("MQTT subscribe failed for %s: %s", config["mqtt_topic"], result)
        else:
            LOGGER.info("Subscribed to %s at QoS 1", config["mqtt_topic"])

    def on_message(_client, _userdata, message):
        topic_device_id = extract_device_id_from_topic(message.topic)
        if not topic_device_id:
            LOGGER.warning("Dropped message from invalid topic format: %s", message.topic)
            return

        if not registry.is_allowed(topic_device_id):
            LOGGER.warning("Dropped message for unknown/unallowed device ID '%s' from topic '%s'", topic_device_id, message.topic)
            return

        validated, reason = parse_message(message.payload)
        if reason:
            LOGGER.warning("Rejected malformed payload from topic %s: %s; payload=%r", message.topic, reason, message.payload)
            return

        document = {
            **validated,
            "device_id": topic_device_id,  # Force topic device_id
            "created_at": datetime.now(timezone.utc),
        }

        try:
            db[topic_device_id].insert_one(document)
        except Exception:
            LOGGER.exception("MongoDB insert failed for collection %s", topic_device_id)
            return

        LOGGER.info(
            "Inserted reading: collection=%s device_id=%s ammonia=%s methane=%s humidity=%s temperature=%s",
            topic_device_id,
            document["device_id"],
            document["ammonia"],
            document["methane"],
            document["humidity"],
            document["temperature"],
        )

    def on_disconnect(_client, _userdata, _disconnect_flags, reason_code, _properties):
        LOGGER.warning("Disconnected from MQTT broker: %s; reconnect loop will retry", reason_code)

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    return client


def run() -> int:
    """Start the bridge and keep its MQTT reconnect loop running."""
    try:
        config = load_config()
        mongo_client, db = create_mongo_client(config["mongo_uri"])
        registry = DeviceRegistry(db)
    except (ValueError, OSError) as error:
        LOGGER.error("Bridge startup failed: %s", error)
        return 1
    except Exception:
        LOGGER.exception("Bridge startup failed while initializing database")
        return 1

    client = create_mqtt_client(config, db, registry)
    try:
        client.connect(config["mqtt_host"], config["mqtt_port"], keepalive=60)
        client.loop_forever(retry_first_connection=False)
    except KeyboardInterrupt:
        LOGGER.info("Stopping bridge")
        return 0
    except OSError as error:
        LOGGER.error("MQTT connection failed: %s", error)
        return 1
    finally:
        if client.is_connected():
            client.disconnect()
        client.loop_stop()
        mongo_client.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    raise SystemExit(run())
