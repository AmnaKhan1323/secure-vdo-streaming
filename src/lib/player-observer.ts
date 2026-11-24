import { validTimeUpdate } from "./player-messages";

export type PlayerObservation = "load" | "ready" | "play" | "playing" | "error";
type ObservablePlayer = {
  on(event: string, callback: (data?: unknown) => void): unknown;
  off(event: string, callback?: (data?: unknown) => void): unknown;
};

export function observePlayer(player: ObservablePlayer, options: { duration: number; elapsed: () => number; onEvent: (event: PlayerObservation, ms: number) => void }) {
  let active = true;
  let playing = false;
  let lastSeconds: number | null = null;
  let observed = false;
  const subscriptions: Array<[string, (data?: unknown) => void]> = [];
  const on = (event: string, callback: (data?: unknown) => void) => { subscriptions.push([event, callback]); player.on(event, callback); };
  const destroy = () => { active = false; for (const [event, callback] of subscriptions) { try { player.off(event, callback); } catch { /* Vendor teardown continues for the other events. */ } } };
  try {
    on("ready", () => {
      if (!active) return;
      options.onEvent("ready", options.elapsed());
    });
    on("play", () => { if (active) { playing = true; options.onEvent("play", options.elapsed()); } });
    on("pause", () => { playing = false; lastSeconds = null; });
    on("ended", () => { playing = false; lastSeconds = null; });
    on("error", () => { if (active) options.onEvent("error", options.elapsed()); });
    on("timeupdate", (data) => {
      if (!active || !validTimeUpdate(data) || data.seconds > options.duration + 2) return;
      if (playing && lastSeconds !== null && data.seconds > lastSeconds + 0.05 && data.seconds - lastSeconds < 5 && !observed) { observed = true; options.onEvent("playing", options.elapsed()); }
      lastSeconds = data.seconds;
    });
  } catch (error) { destroy(); throw error; }
  return { destroy };
}