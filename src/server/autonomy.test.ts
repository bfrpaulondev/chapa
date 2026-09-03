import assert from "node:assert/strict";
import test from "node:test";
import { readinessFeatures, readinessScore } from "./autonomy.js";

test("high readiness produces a high score", () => {
  const score = readinessScore({ energy: 9, sleepHours: 8, soreness: 2, stress: 2, availableMinutes: 75 });
  assert.ok(score >= 75, `expected >= 75, received ${score}`);
});

test("poor recovery produces a conservative score", () => {
  const score = readinessScore({ energy: 2, sleepHours: 4, soreness: 9, stress: 9, availableMinutes: 30 });
  assert.ok(score <= 35, `expected <= 35, received ${score}`);
});

test("readiness features clamp out-of-range input", () => {
  const features = readinessFeatures({ energy: 50, sleepHours: -2, soreness: 50, stress: -4, availableMinutes: 999 });
  assert.deepEqual(features, { energy: 1, sleep: 0, recovery: 0, calm: 0.9, time: 2 });
});
