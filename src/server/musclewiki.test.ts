import assert from "node:assert/strict";
import test from "node:test";
import { findExerciseGuide } from "./musclewiki.js";

test("returns safe technique guidance when MuscleWiki is not configured", async () => {
  const previous = process.env.MUSCLEWIKI_API_KEY;
  delete process.env.MUSCLEWIKI_API_KEY;
  const guide = await findExerciseGuide("Barbell Bench Press");
  if (previous) process.env.MUSCLEWIKI_API_KEY = previous;

  assert.equal(guide.available, false);
  assert.equal(guide.videos.length, 0);
  assert.ok(guide.steps.length >= 3);
});
