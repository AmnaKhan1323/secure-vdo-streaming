import { trustedPlayerMessage } from "./player-messages";

export type ProviderSdk = { kind: "gumlet"; module: typeof import("@gumlet/player.js") } | { kind: "bunny"; module: (typeof import("player.js"))["default"] };

/** Vendor lifecycle adapter. The SDK objects are external imperative libraries,
 * not React state; keep their documented listener capture outside React render.
 */
export function attachProviderPlayer(sdk: ProviderSdk, iframe: HTMLIFrameElement) {
  const listeners: Array<{ listener: EventListenerOrEventListenerObject; capture: boolean }> = [];
  const original = window.addEventListener;
  // Synchronous construction only: capture vendor-created message listeners so
  // even a constructor that throws midway cannot leak a per-player listener.
  window.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === "message") listeners.push({ listener, capture: typeof options === "boolean" ? options : options?.capture ?? false });
    original.call(window, type, listener, options);
  };
  let player: import("@gumlet/player.js").Player | import("player.js").Player;
  const removeListeners = () => { for (const entry of listeners) window.removeEventListener("message", entry.listener, entry.capture); iframe.onload = null; };
  try {
    player = sdk.kind === "gumlet" ? new sdk.module.Player(iframe, false) : new sdk.module.Player(iframe);
  } catch (error) { removeListeners(); throw error; }
  finally { window.addEventListener = original; }
  const origin = new URL(iframe.src).origin;
  const receive = player.receive.bind(player);
  player.receive = (event: MessageEvent) => trustedPlayerMessage(event, origin, iframe.contentWindow) ? receive(event) : false;
  return {
    player,
    destroy() {
      if ("destroy" in player) player.destroy();
      removeListeners();
    },
  };
}