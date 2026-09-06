# Prohori Mimic Device

This folder contains Phase 3's fake sensor publisher data-generation logic.

`generator.py` is complete and produces bounded random-walk readings for ammonia, methane, humidity, and temperature. MQTT publishing is intentionally not included yet; the publishing loop will be added in Stage 9b.

Use `python run_local_test.py` to print a short sample locally. This code is for development and testing only and must not be used in production.
