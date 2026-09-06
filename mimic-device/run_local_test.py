"""Print a short local sample of generated Prohori readings."""

from generator import generate_reading, initial_state


state = initial_state()

for _ in range(20):
    state = generate_reading(state)
    print(
        f"ammonia={state['ammonia']:.1f} "
        f"methane={state['methane']:.1f} "
        f"humidity={state['humidity']:.1f} "
        f"temperature={state['temperature']:.1f}"
    )
