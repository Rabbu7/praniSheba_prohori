"""Print a short local sample of generated Prohori readings for configured devices."""

import os
from pathlib import Path
from dotenv import load_dotenv
from generator import generate_reading, initial_state

load_dotenv(Path(__file__).with_name(".env"))
raw_ids = os.getenv("DEVICE_IDS", "G3036,G3037,G3038,G3040,G3041,G3042")
device_ids = [d.strip() for d in raw_ids.split(",") if d.strip()]

states = {device_id: initial_state(i) for i, device_id in enumerate(device_ids)}

print(f"Testing reading generator for {len(device_ids)} device(s): {', '.join(device_ids)}\n")

for step in range(5):
    print(f"--- Step {step + 1} ---")
    for device_id in device_ids:
        states[device_id] = generate_reading(states[device_id])
        st = states[device_id]
        print(
            f"[{device_id}] "
            f"ammonia={st['ammonia']:.1f} "
            f"methane={st['methane']:.1f} "
            f"humidity={st['humidity']:.1f} "
            f"temperature={st['temperature']:.1f}"
        )
