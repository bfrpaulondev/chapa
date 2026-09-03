#!/usr/bin/env python3
"""Train CHAPA's small preference policy from anonymized feedback events.

This intentionally trains only decision preferences. The language model remains
read-only and every generated decision still passes through runtime safety rules.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


FEATURES = ("energy", "sleep", "recovery", "calm", "time", "mode_push", "mode_maintain", "mode_recover")


# -.-.-.- Keep every feature inside a stable numerical range.
def clamp(value: float, minimum: float, maximum: float) -> float:
    return min(maximum, max(minimum, value))


# -.-.-.- Convert stored check-in values into the same features used in production.
def build_features(event: dict[str, Any]) -> dict[str, float]:
    check_in = event.get("checkIn", {})
    mode = event.get("mode", "maintain")
    values = {
        "energy": clamp(float(check_in.get("energy", 5)), 1, 10) / 10,
        "sleep": clamp(float(check_in.get("sleepHours", 7)), 0, 10) / 8,
        "recovery": 1 - clamp(float(check_in.get("soreness", 5)), 1, 10) / 10,
        "calm": 1 - clamp(float(check_in.get("stress", 5)), 1, 10) / 10,
        "time": clamp(float(check_in.get("availableMinutes", 60)), 10, 120) / 60,
    }
    values[f"mode_{mode}"] = 1.0
    return values


# -.-.-.- Train an interpretable linear reward model with stochastic gradient descent.
def train(events: list[dict[str, Any]], epochs: int, learning_rate: float) -> dict[str, Any]:
    weights = {feature: 0.0 for feature in FEATURES}
    bias = 0.0

    for _ in range(epochs):
        for event in events:
            features = build_features(event)
            target = clamp(float(event.get("reward", 0)), -1, 1)
            prediction = bias + sum(weights[name] * features.get(name, 0.0) for name in FEATURES)
            error = target - math.tanh(prediction)
            bias += learning_rate * error
            for name in FEATURES:
                weights[name] += learning_rate * error * features.get(name, 0.0)

    return {
        "modelVersion": "python-linear-v1",
        "samples": len(events),
        "bias": round(bias, 6),
        "weights": {name: round(value, 6) for name, value in weights.items()},
    }


# -.-.-.- Read JSON Lines so large histories can be streamed without loading a JSON array.
def load_events(path: Path) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSON on line {line_number}: {error}") from error
    return events


# -.-.-.- Provide a deterministic command-line entry point for local or scheduled retraining.
def main() -> None:
    parser = argparse.ArgumentParser(description="Train CHAPA's preference policy")
    parser.add_argument("input", type=Path, help="Anonymized feedback events in JSONL format")
    parser.add_argument("--output", type=Path, default=Path("ml/model.json"))
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--learning-rate", type=float, default=0.025)
    args = parser.parse_args()

    events = load_events(args.input)
    if not events:
        raise SystemExit("No feedback events found")
    model = train(events, max(args.epochs, 1), clamp(args.learning_rate, 0.0001, 0.5))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Trained {model['modelVersion']} with {model['samples']} samples -> {args.output}")


if __name__ == "__main__":
    main()
