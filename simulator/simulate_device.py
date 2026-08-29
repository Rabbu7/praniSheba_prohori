import os
import random
import sys
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import AutoReconnect, ConfigurationError, OperationFailure, PyMongoError


INTERVAL_SECONDS = 60
DEVICE_ID = "G3036"
MONGO_DATABASE = "iotdb"
MONGO_COLLECTION = "G3036"
METHANE_SPIKE_PROBABILITY = 0.015

METRIC_STEPS = {
    "ammonia": 2.5,
    "methane": 150,
    "humidity": 3,
    "temperature": 2,
}

METRIC_BOUNDS = {
    "ammonia": (0, 30),
    "methane": (50, 2500),
    "humidity": (0, 100),
    "temperature": (15, 90),
}


class FatalSimulatorError(Exception):
    """Raised when the simulator cannot use its MongoDB configuration."""


def load_mongo_uri():
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        raise FatalSimulatorError(
            "MONGO_URI is missing. Create simulator/.env from simulator/.env.example."
        )
    return mongo_uri


def connect_to_collection(mongo_uri):
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        return client, client[MONGO_DATABASE][MONGO_COLLECTION]
    except (ConfigurationError, OperationFailure, PyMongoError) as error:
        raise FatalSimulatorError(f"MongoDB connection failed: {error}") from error


def next_state(state):
    updated = {}
    for metric, value in state.items():
        floor, ceiling = METRIC_BOUNDS[metric]
        delta = random.gauss(0, METRIC_STEPS[metric])
        updated[metric] = max(floor, min(ceiling, value + delta))

    spike_value = None
    if random.random() < METHANE_SPIKE_PROBABILITY:
        spike_value = random.uniform(50000, 75000)

    return updated, spike_value


def build_reading(state, methane_spike_override=None):
    methane_value = methane_spike_override if methane_spike_override is not None else state["methane"]
    return {
        "device_id": DEVICE_ID,
        "ammonia": round(state["ammonia"], 1),
        "methane": round(methane_value, 1),
        "humidity": int(round(state["humidity"])),
        "temperature": int(round(state["temperature"])),
        "timestamp": int(time.time()),
        "created_at": datetime.now(timezone.utc),
    }


def log_reading(reading):
    timestamp = reading["created_at"].isoformat(timespec="seconds").replace("+00:00", "Z")
    print(
        f"[{timestamp}] {reading['device_id']} -> "
        f"NH3={reading['ammonia']:.1f} CH4={reading['methane']:.1f} "
        f"RH={reading['humidity']} T={reading['temperature']}",
        flush=True,
    )


def run():
    client = None
    try:
        mongo_uri = load_mongo_uri()
        client, collection = connect_to_collection(mongo_uri)
        print(f"Connected to {MONGO_DATABASE}.{MONGO_COLLECTION}; simulator started.", flush=True)

        state = {
            "ammonia": 5.0,
            "methane": 400.0,
            "humidity": 60.0,
            "temperature": 55.0,
        }

        while True:
            state, methane_spike = next_state(state)
            reading = build_reading(state, methane_spike_override=methane_spike)
            try:
                collection.insert_one(reading)
                log_reading(reading)
            except (AutoReconnect, TimeoutError) as error:
                print(f"Transient insert error; continuing: {error}", file=sys.stderr, flush=True)
            except (ConfigurationError, OperationFailure) as error:
                raise FatalSimulatorError(f"Fatal MongoDB insert error: {error}") from error
            except PyMongoError as error:
                print(f"Insert error; continuing: {error}", file=sys.stderr, flush=True)

            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("Simulator stopped.", flush=True)
    except FatalSimulatorError as error:
        print(f"Simulator stopped: {error}", file=sys.stderr, flush=True)
        return 1
    finally:
        if client is not None:
            client.close()
    return 0


if __name__ == "__main__":
    sys.exit(run())
