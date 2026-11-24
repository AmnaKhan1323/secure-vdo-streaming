import assert from "node:assert/strict";
import { test } from "node:test";
import { acceptProgressUpdate } from "../src/lib/progress-order";

const previous = { playbackAttemptId: "attempt-b", playbackStartedAt: new Date(2000), sequence: 4 };

test("Progress sequences reject duplicates/delays but allow an intentional later backward seek", () => {
  const attempt = { id: "attempt-b", createdAt: new Date(2000) };
  assert.equal(acceptProgressUpdate(previous, attempt, 3), false);
  assert.equal(acceptProgressUpdate(previous, attempt, 4), false);
  assert.equal(acceptProgressUpdate(previous, attempt, 5), true);
});

test("Older playback attempts cannot overwrite the resume position from a newer session", () => {
  assert.equal(acceptProgressUpdate(previous, { id: "attempt-a", createdAt: new Date(1000) }, 999), false);
  assert.equal(acceptProgressUpdate(previous, { id: "attempt-c", createdAt: new Date(3000) }, 1), true);
});

test("Legacy saved progress accepts a new bound attempt without replacing historical completion", () => {
  assert.equal(acceptProgressUpdate(null, { id: "new", createdAt: new Date() }, 1), true);
  assert.equal(acceptProgressUpdate({ playbackAttemptId: null, playbackStartedAt: null, sequence: 0 }, { id: "new", createdAt: new Date() }, 1), true);
});