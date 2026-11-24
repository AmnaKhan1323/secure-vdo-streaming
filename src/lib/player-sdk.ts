import { trustedPlayerMessage } from "./player-messages";

export type ProviderSdk = { kind: "gumlet"; module: typeof import("@gumlet/player.js") } | { kind: "bunny"; module: (typeof import("player.js"))["default"] };

/** Vendor lifecycle adapter. The SDK objects are external imperative libraries,
 * not React state; keep their documented listener capture outside React render.
 */
export function attachProviderPlayer(sdk: ProviderSdk, iframe: HTMLIFrameElement) {
  let listener: EventListener | undefined;
  let player: import("@gumlet/player.js").Player | import("player.js").Player;
  if (sdk.kind === "gumlet") {
    player = new sdk.module.Player(iframe, false);
  } else {
    const original = sdk.module.addEvent;
    sdk.module.addEvent = (element, type, handler) => {
      if (element === window && type === "message") listener = handler;
      original(element, type, handler);
    };
    try { player = new sdk.module.Player(iframe); }
    finally { sdk.module.addEvent = original; }
  }
  const origin = new URL(iframe.src).origin;
  const receive = player.receive.bind(player);
  player.receive = (event: MessageEvent) => trustedPlayerMessage(event, origin, iframe.contentWindow) ? receive(event) : false;
  return {
    player,
    destroy() {
      if ("destroy" in player) player.destroy();
      if (listener) window.removeEventListener("message", listener);
      iframe.onload = null;
    },
  };
}