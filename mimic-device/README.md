# Prohori Mimic Device

This folder contains the fake sensor publisher for Prohori devices.

`generator.py` produces bounded random-walk readings for ammonia, methane, humidity, and temperature, maintaining independent state per device. `publisher.py` publishes readings for all configured devices over MQTT.

## Configuration

Copy `.env.example` to `.env`, then configure broker details and `DEVICE_IDS` (comma-separated):

```text
MQTT_HOST=152.42.179.228
MQTT_PORT=1885
MQTT_USER=apsIoT
MQTT_PASS=your_password
DEVICE_IDS=G3036,G3037,G3038,G3040,G3041,G3042
PUBLISH_INTERVAL_SECONDS=60
```

Do not commit `.env` or real credentials.

## Run

Install dependencies and start the publisher from this folder:

```text
pip install -r requirements.txt
python publisher.py
```

The publisher sends QoS 1, non-retained JSON messages for each device to `prohori/<deviceId>/reading` at the configured interval.

Use `python run_local_test.py` to print a short local sample for all configured devices without needing a broker.
