"""Pure random-walk sensor reading generation for the Prohori mimic device."""

import random
from typing import Dict


ReadingState = Dict[str, float]


def initial_state() -> ReadingState:
    """Return a safe-zone starting state for all four sensors."""
    return {
        "ammonia": 6.5,
        "methane": 125.0,
        "humidity": 60.0,
        "temperature": 58.0,
    }


def _walk(value: float, baseline: float, step: float, minimum: float, maximum: float,
          excursion_chance: float, danger_chance: float, preferred_direction: int,
          warning_boundary: float, danger_boundary: float, bidirectional: bool = True) -> float:
    """Take one bounded step, occasionally sustaining drift into alert zones."""
    distance_from_baseline = value - baseline
    direction = 0

    if abs(distance_from_baseline) >= danger_boundary:
        direction = -1 if distance_from_baseline > 0 else 1
    elif abs(distance_from_baseline) >= warning_boundary:
        is_preferred_side = distance_from_baseline * preferred_direction > 0
        if bidirectional or is_preferred_side:
            direction = 1 if distance_from_baseline > 0 else -1
        else:
            direction = 1 if distance_from_baseline < 0 else -1
    elif random.random() < danger_chance:
        direction = preferred_direction
    elif random.random() < excursion_chance:
        direction = preferred_direction if not bidirectional or random.random() < 0.7 else -preferred_direction
    elif abs(distance_from_baseline) > step and random.random() < 0.65:
        direction = -1 if distance_from_baseline > 0 else 1

    change = random.uniform(0.35 * step, step)
    if direction == 0:
        change = random.uniform(-step, step)
    else:
        change *= direction

    return round(max(minimum, min(maximum, value + change)), 1)


def generate_reading(state: ReadingState) -> ReadingState:
    """Return the next reading using small random-walk steps.

    The input state is not mutated. Values are bounded to plausible physical
    ranges while rare directional drift can reach warning or danger zones.
    """
    return {
        "ammonia": _walk(
            state["ammonia"], baseline=6.5, step=1.8, minimum=0.0, maximum=60.0,
                excursion_chance=0.18, danger_chance=0.04, preferred_direction=1,
                warning_boundary=3.5, danger_boundary=18.5, bidirectional=False,
        ),
        "methane": _walk(
            state["methane"], baseline=125.0, step=30.0, minimum=0.0, maximum=10000.0,
                excursion_chance=0.06, danger_chance=0.008, preferred_direction=1,
                warning_boundary=875.0, danger_boundary=4875.0, bidirectional=False,
        ),
        "humidity": _walk(
            state["humidity"], baseline=60.0, step=2.8, minimum=0.0, maximum=100.0,
                excursion_chance=0.14, danger_chance=0.025,
                preferred_direction=1 if random.random() < 0.5 else -1,
                warning_boundary=10.0, danger_boundary=25.0,
        ),
        "temperature": _walk(
            state["temperature"], baseline=58.0, step=2.5, minimum=-40.0, maximum=140.0,
                excursion_chance=0.13, danger_chance=0.02,
                preferred_direction=1 if random.random() < 0.5 else -1,
                warning_boundary=12.0, danger_boundary=33.0,
        ),
    }
