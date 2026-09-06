# Prohori Mimic Device

This folder contains Phase 3's fake sensor publisher.

`generator.py` produces bounded random-walk readings for ammonia, methane, humidity, and temperature. Stage 9b adds the MQTT publishing loop in `publisher.py`.

## Local/test broker

Stage 9b targets a local or test MQTT broker for validating the future bridge subscriber. It does not integrate with the real Prohori broker yet; that path remains pending supervisor clarification described in `AGENTS.md`.

Copy `.env.example` to `.env`, then replace the broker values with your local/test broker settings. Do not commit `.env` or real credentials.

## Run

Install dependencies and start the publisher from this folder:

```text
pip install -r requirements.txt
python publisher.py
```

The publisher sends QoS 1, non-retained JSON messages at the configured interval. Subscribe from a second terminal with `mosquitto_sub` or MQTT Explorer to inspect them.

Use `python run_local_test.py` to print a short generator-only sample locally. This code is for development and testing only and must not be used in production.
