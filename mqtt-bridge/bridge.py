"""Bridge Prohori MQTT readings into the MongoDB G3036 collection."""

import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection


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


def validate_payload(payload: object) -> tuple[dict | None, str | None]:
    """Return the allowlisted reading fields or a reason for rejection."""
    if not isinstance(payload, dict):
        return None, "payload must be a JSON object"

    missing = [field for field in REQUIRED_FIELDS if field not in payload]
    if missing:
        return None, f"missing required field(s): {', '.join(missing)}"

    if not isinstance(payload["device_id"], str) or not payload["device_id"].strip():
        return None, "device_id must be a non-empty string"

    for field in NUMERIC_FIELDS:
        value = payload[field]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            return None, f"{field} must be a finite number"

    timestamp = payload["timestamp"]
    if isinstance(timestamp, bool) or not isinstance(timestamp, int):
        return None, "timestamp must be an integer Unix epoch value"

    return {field: payload[field] for field in REQUIRED_FIELDS}, None


def parse_message(raw_payload: bytes) -> tuple[dict | None, str | None]:
    """Decode and validate one MQTT payload without raising to the callback."""
    try:
        payload = json.loads(raw_payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        return None, f"invalid JSON: {error}"

    return validate_payload(payload)


def create_mongo_client(mongo_uri: str) -> tuple[MongoClient, Collection]:
    """Connect to the fixed database and collection used by this bridge."""
    mongo_client = MongoClient(mongo_uri, serverSelectionTimeoutMS=CONNECT_TIMEOUT_MS)
    mongo_client.admin.command("ping")
    return mongo_client, mongo_client["iotdb"]["G3036"]


def create_mqtt_client(config: dict, collection: Collection) -> mqtt.Client:
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
        validated, reason = parse_message(message.payload)
        if reason:
            LOGGER.warning("Rejected malformed payload: %s; payload=%r", reason, message.payload)
            return

        document = {
            **validated,
            "created_at": datetime.now(timezone.utc),
        }
        try:
            collection.insert_one(document)
        except Exception:
            LOGGER.exception("MongoDB insert failed for validated reading")
            return

        LOGGER.info(
            "Inserted reading: device_id=%s ammonia=%s methane=%s humidity=%s temperature=%s",
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
        mongo_client, collection = create_mongo_client(config["mongo_uri"])
    except (ValueError, OSError) as error:
        LOGGER.error("Bridge startup failed: %s", error)
        return 1
    except Exception:
        LOGGER.exception("Bridge startup failed while connecting to MongoDB")
        return 1

    client = create_mqtt_client(config, collection)
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
