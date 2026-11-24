const events = new Set(["ready", "play", "pause", "ended", "timeupdate", "progress", "seeked", "error", "playbackratechange", "playbackRateChange", "fullscreenChange", "pipChange", "audioChange", "qualityChange", "volumeChange", "subtitleChange", "getCurrentTime", "getDuration", "getPaused", "getMuted", "getVolume", "getLoop"]);

export function trustedPlayerMessage(event: Pick<MessageEvent, "data" | "origin" | "source">, expectedOrigin: string, expectedSource: MessageEventSource | null) {
  if (!expectedSource || event.source !== expectedSource || event.origin !== expectedOrigin) return false;
  let data: unknown = event.data;
  if (typeof data === "string") {
    if (data.length > 16_384) return false;
    try { data = JSON.parse(data); } catch { return false; }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
  const payload = data as Record<string, unknown>;
  return payload.context === "player.js" && typeof payload.event === "string" && events.has(payload.event);
}

export function validTimeUpdate(value: unknown): value is { seconds: number; duration: number } {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;
  return typeof data.seconds === "number" && Number.isFinite(data.seconds) && data.seconds >= 0 && typeof data.duration === "number" && Number.isFinite(data.duration) && data.duration > 0;
}