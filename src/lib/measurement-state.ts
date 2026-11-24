import type { PlaybackMetrics } from "./types";

export function nextMeasurementOutcome(previous: PlaybackMetrics["outcome"], incoming: PlaybackMetrics["outcome"]) {
  if (previous === "expired" || previous === "cancelled") return previous;
  if (incoming === "issued") return previous;
  if (incoming === "ready" && ["playing", "error"].includes(previous)) return previous;
  if (incoming === "timeout" && previous !== "issued") return previous;
  return incoming;
}