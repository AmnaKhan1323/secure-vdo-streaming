import assert from "node:assert/strict";
import { test } from "node:test";
import { attachProviderPlayer, type ProviderSdk } from "../src/lib/player-sdk";

test("Actual installed Player.js SDKs validate source/origin and release per-player listeners", async () => {
  // DOM/message contract fixture only. No provider playback or HTTP is simulated.
  const listeners = new Set<EventListener>();
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const browser = {
    postMessage() {},
    location: { protocol: "https:" },
    addEventListener(type: string, listener: EventListener) { if (type === "message") listeners.add(listener); },
    removeEventListener(type: string, listener: EventListener) { if (type === "message") listeners.delete(listener); },
  };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: { getElementById: () => null } });
  try {
    const sdks: ProviderSdk[] = [
      { kind: "gumlet", module: await import("@gumlet/player.js") },
      { kind: "bunny", module: (await import("player.js")).default },
    ];
    for (const sdk of sdks) {
      const outgoing: Array<{ method: string; value: unknown; listener?: string }> = [];
      const source = { postMessage(data: string) { outgoing.push(JSON.parse(data)); } };
      const origin = sdk.kind === "gumlet" ? "https://play.gumlet.io" : "https://player.mediadelivery.net";
      const iframe = { nodeName: "IFRAME", src: `${origin}/embed/contract-fixture`, contentWindow: source, onload: null } as unknown as HTMLIFrameElement;
      const initialListeners = listeners.size;
      const { player, destroy } = attachProviderPlayer(sdk, iframe);
      let ready = 0;
      let played = 0;
      player.on("ready", () => { ready++; });
      player.on("play", () => { played++; });
      const send = (payload: object, eventOrigin = origin, eventSource: object = source) => {
        const event = { origin: eventOrigin, source: eventSource, data: JSON.stringify({ context: "player.js", version: "0.0.11", ...payload }) } as unknown as Event;
        for (const listener of [...listeners]) listener(event);
      };
      const readiness = { event: "ready", value: { src: iframe.src, events: ["ready", "play", "timeupdate"], methods: ["play", "pause", "setCurrentTime"] } };
      send(readiness, origin, {});
      send(readiness, `${origin}.evil.invalid`);
      assert.equal(ready, 0, "Spoofed frame or origin must not invoke readiness.");
      send(readiness);
      assert.equal(ready, 1);
      const playListener = outgoing.find((message) => message.method === "addEventListener" && message.value === "play")?.listener;
      assert.ok(playListener);
      send({ event: "play", listener: playListener }, origin, {});
      assert.equal(played, 0);
      send({ event: "play", listener: playListener });
      assert.equal(played, 1);
      assert.ok(listeners.size > initialListeners);
      destroy();
      assert.equal(listeners.size, initialListeners, "Per-player message listeners must be released.");
      send({ event: "play", listener: playListener });
      assert.equal(played, 1, "Destroyed player cannot receive more callbacks.");
    }
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window");
    if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument); else Reflect.deleteProperty(globalThis, "document");
  }
});

test("A constructor failure removes partial message listeners and restores browser methods", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const listeners = new Set<unknown>();
  const browser = { addEventListener(_type: string, listener: unknown) { listeners.add(listener); }, removeEventListener(_type: string, listener: unknown) { listeners.delete(listener); } };
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  const original = browser.addEventListener;
  class BrokenPlayer { constructor() { window.addEventListener("message", () => {}); throw new Error("Explicit constructor failure fixture."); } }
  try {
    const sdk = { kind: "bunny", module: { Player: BrokenPlayer } } as unknown as ProviderSdk;
    const iframe = { src: "https://player.mediadelivery.net/embed/fixture", onload: null } as unknown as HTMLIFrameElement;
    assert.throws(() => attachProviderPlayer(sdk, iframe), /constructor failure/);
    assert.equal(listeners.size, 0);
    assert.equal(browser.addEventListener, original);
  } finally { if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow); else Reflect.deleteProperty(globalThis, "window"); }
});