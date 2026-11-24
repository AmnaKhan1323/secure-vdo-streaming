import assert from "node:assert/strict";
import { test } from "node:test";
import { loadProviderSdk, PlayerSetupError } from "../src/lib/player-setup";
import type { ProviderSdk } from "../src/lib/player-sdk";
import { observePlayer } from "../src/lib/player-observer";
import { closeOnStartupFailure } from "../scripts/startup-cleanup";

test("Rejected/hanging SDK loads fail explicitly and a retry can succeed", async () => {
  await assert.rejects(() => loadProviderSdk("GUMLET", new AbortController().signal, 100, async () => { throw new Error("fixture failure"); }), (error) => error instanceof PlayerSetupError && error.code === "load");
  await assert.rejects(() => loadProviderSdk("GUMLET", new AbortController().signal, 1, () => new Promise(() => {})), (error) => error instanceof PlayerSetupError && error.code === "timeout");
  const fixture = { kind: "gumlet", module: {} } as ProviderSdk;
  assert.equal(await loadProviderSdk("GUMLET", new AbortController().signal, 100, async () => fixture), fixture);
});

test("Unmount cancels pending SDK setup without importing a fallback stream", async () => {
  const controller = new AbortController();
  const setup = loadProviderSdk("BUNNY", controller.signal, 100, () => new Promise(() => {}));
  controller.abort();
  await assert.rejects(setup, (error) => error instanceof PlayerSetupError && error.code === "aborted");
});

test("Ready/play are not playback success; advancing valid media time is observed", () => {
  const callbacks = new Map<string, (data?: unknown) => void>();
  const observed: string[] = [];
  const player = { on: (event: string, callback: (data?: unknown) => void) => { callbacks.set(event, callback); }, off: (event: string) => { callbacks.delete(event); } };
  const observer = observePlayer(player, { duration: 1, elapsed: () => 1, onEvent: (event) => observed.push(event) });
  callbacks.get("ready")?.();
  callbacks.get("play")?.();
  assert.equal(observed.includes("playing"), false);
  callbacks.get("timeupdate")?.({ seconds: 0.1, duration: 1 });
  callbacks.get("timeupdate")?.({ seconds: 0.3, duration: 1 });
  assert.ok(observed.includes("playing"));
  callbacks.get("pause")?.();
  callbacks.get("ended")?.();
  observer.destroy();
  assert.equal(callbacks.size, 0);
});

test("Invalid/out-of-range media observations never count as playback", () => {
  const callbacks = new Map<string, (data?: unknown) => void>();
  const observed: string[] = [];
  const player = { on: (event: string, callback: (data?: unknown) => void) => { callbacks.set(event, callback); }, off: (event: string) => { callbacks.delete(event); } };
  const observer = observePlayer(player, { duration: 1, elapsed: () => 0, onEvent: (event) => observed.push(event) });
  callbacks.get("play")?.();
  for (const seconds of [Infinity, NaN, 100, 101]) callbacks.get("timeupdate")?.({ seconds, duration: 1 });
  assert.equal(observed.includes("playing"), false);
  observer.destroy();
});

test("Bootstrap and child-start failures close local resources; success transfers ownership", async () => {
  for (const reason of ["seed failure", "spawn failure"]) {
    let closed = 0;
    await assert.rejects(() => closeOnStartupFailure({ close: async () => { closed++; } }, async () => { throw new Error(reason); }), new RegExp(reason));
    assert.equal(closed, 1);
  }
  let closed = 0;
  assert.equal(await closeOnStartupFailure({ close: async () => { closed++; } }, async () => "started"), "started");
  assert.equal(closed, 0);
});