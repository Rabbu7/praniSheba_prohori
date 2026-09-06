"""Publish generated Prohori readings to a test MQTT broker."""

import json
import logging
import os
import threading
import time
from pathlib import Path

import paho.mqtt.client as mqtt
from dotenv import load_dotenv

from generator import generate_reading, initial_state


LOGGER = logging.getLogger("mimic-device")
CONNECT_TIMEOUT_SECONDS = 10
REQUIRED_ENV_VARS = (
    "MQTT_HOST",
    "MQTT_PORT",
    "MQTT_USER",
    "MQTT_PASS",
    "MQTT_TOPIC",
    "DEVICE_ID",
    "PUBLISH_INTERVAL_SECONDS",
)


def load_config() -> dict:
    """Load and validate publisher settings from mimic-device/.env."""
    load_dotenv(Path(__file__).with_name(".env"))

    missing = [name for name in REQUIRED_ENV_VARS if not os.getenv(name)]
    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    try:
        port = int(os.environ["MQTT_PORT"])
        interval = float(os.environ["PUBLISH_INTERVAL_SECONDS"])
    except ValueError as error:
        raise ValueError("MQTT_PORT must be an integer and PUBLISH_INTERVAL_SECONDS must be a number") from error

    if not 1 <= port <= 65535:
        raise ValueError("MQTT_PORT must be between 1 and 65535")
    if interval <= 0:
        raise ValueError("PUBLISH_INTERVAL_SECONDS must be greater than zero")

    return {
        "host": os.environ["MQTT_HOST"],
        "port": port,
        "username": os.environ["MQTT_USER"],
        "password": os.environ["MQTT_PASS"],
        "topic": os.environ["MQTT_TOPIC"],
        "device_id": os.environ["DEVICE_ID"],
        "interval": interval,
    }


def create_client(config: dict, connected_event: threading.Event) -> mqtt.Client:
    """Create an authenticated MQTT v2 client with connection logging."""
    client = mqtt.Client(
        callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        client_id=config["device_id"],
    )
    client.username_pw_set(config["username"], config["password"])

    def on_connect(_client, _userdata, _flags, reason_code, _properties):
        if reason_code.is_failure:
            LOGGER.error("MQTT connection failed: %s", reason_code)
        else:
            LOGGER.info("Connected to MQTT broker at %s:%s", config["host"], config["port"])
        connected_event.set()

    def on_disconnect(_client, _userdata, _disconnect_flags, reason_code, _properties):
        if reason_code != mqtt.MQTT_ERR_SUCCESS:
            LOGGER.warning("Disconnected from MQTT broker: %s", reason_code)

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    return client


def build_payload(state: dict, device_id: str) -> dict:
    """Build the JSON-compatible payload consumed by the future bridge."""
    return {
        "device_id": device_id,
        "ammonia": state["ammonia"],
        "methane": state["methane"],
        "humidity": state["humidity"],
        "temperature": state["temperature"],
        "timestamp": int(time.time()),
    }


def run() -> int:
    """Connect once, publish until interrupted, then disconnect cleanly."""
    try:
        config = load_config()
    except ValueError as error:
        LOGGER.error("Configuration error: %s", error)
        return 1

    connected_event = threading.Event()
    client = create_client(config, connected_event)

    try:
        client.connect(config["host"], config["port"], keepalive=60)
        client.loop_start()

        if not connected_event.wait(CONNECT_TIMEOUT_SECONDS):
            raise RuntimeError(f"MQTT connection timed out after {CONNECT_TIMEOUT_SECONDS} seconds")
        if not client.is_connected():
            raise RuntimeError("MQTT broker rejected the connection")

        state = initial_state()
        while True:
            state = generate_reading(state)
            payload = build_payload(state, config["device_id"])
            message = json.dumps(payload)
            result = client.publish(config["topic"], message, qos=1, retain=False)
            result.wait_for_publish()
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                raise RuntimeError(f"MQTT publish failed with result code {result.rc}")
            LOGGER.info("Published: %s", message)
            time.sleep(config["interval"])
    except KeyboardInterrupt:
        LOGGER.info("Stopping publisher")
        return 0
    except (OSError, RuntimeError) as error:
        LOGGER.error("Publisher failed: %s", error)
        return 1
    finally:
        if client.is_connected():
            client.disconnect()
        client.loop_stop()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    raise SystemExit(run())
