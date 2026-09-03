import assert from "node:assert/strict";
import test from "node:test";
import { parseRepRange, recommendLoad } from "../lib/training";

test("parses common repetition ranges", () => {
  assert.deepEqual(parseRepRange("8-12"), { minimum: 8, maximum: 12 });
  assert.deepEqual(parseRepRange("10–15 reps"), { minimum: 10, maximum: 15 });
});

test("starts with calibration when no prior load exists", () => {
  assert.equal(recommendLoad("8-12").action, "calibrate");
});

test("increases load after completing the top of the range with reserve", () => {
  const result = recommendLoad("8-12", [
    { weightKg: 80, reps: 12, rir: 2 },
    { weightKg: 80, reps: 12, rir: 2 },
  ]);
  assert.equal(result.action, "increase");
  assert.equal(result.weightKg, 82);
});

test("reduces load when repetitions fall below target", () => {
  const result = recommendLoad("8-12", [{ weightKg: 80, reps: 6, rir: 0 }]);
  assert.equal(result.action, "reduce");
  assert.equal(result.weightKg, 76);
});
