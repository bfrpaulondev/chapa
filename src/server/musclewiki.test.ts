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

test("explains when a BASIC key is rejected outside the Playground", async () => {
  const previousKey = process.env.MUSCLEWIKI_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.MUSCLEWIKI_API_KEY = "mw_test";
  globalThis.fetch = async () => new Response(JSON.stringify({ detail: "Upgrade required" }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });

  try {
    const guide = await findExerciseGuide("Supino reto");
    assert.equal(guide.available, false);
    assert.match(guide.reason ?? "", /BASIC/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey) process.env.MUSCLEWIKI_API_KEY = previousKey;
    else delete process.env.MUSCLEWIKI_API_KEY;
  }
});
