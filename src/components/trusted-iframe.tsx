"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { PlaybackTicket } from "@/lib/types";
import { validTimeUpdate } from "@/lib/player-messages";
import { attachProviderPlayer, type ProviderSdk } from "@/lib/player-sdk";
import { LoaderCircle } from "lucide-react";

export function TrustedIframe({ ticket, title, resumeAt, onEvent, onProgress }: { ticket: PlaybackTicket; title: string; resumeAt: number; onEvent: (event: "load" | "ready" | "play" | "playing" | "error", ms: number) => void; onProgress: (seconds: number) => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sdk, setSdk] = useState<ProviderSdk | null>(null);
  const eventCallback = useEffectEvent(onEvent);
  const progressCallback = useEffectEvent(onProgress);

  useEffect(() => {
    let cancelled = false;
    const load = ticket.provider === "GUMLET" ? import("@gumlet/player.js").then((module) => ({ kind: "gumlet" as const, module })) : import("player.js").then((module) => ({ kind: "bunny" as const, module: module.default }));
    load.then((loaded) => { if (!cancelled) setSdk(loaded); }).catch(() => { if (!cancelled) eventCallback("error", 0); });
    return () => { cancelled = true; };
  }, [ticket.provider]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !sdk) return;
    const started = performance.now();
    let playing = false;
    let lastSeconds: number | null = null;
    let reportedPlayback = false;
    let didResume = false;
    const { player, destroy } = attachProviderPlayer(sdk, iframe);
    const elapsed = () => performance.now() - started;
    const ready = () => {
      eventCallback("ready", elapsed());
      if (!didResume && resumeAt > 0 && resumeAt < ticket.durationSeconds - 1 && ticket.mode === "standard") {
        didResume = true;
        const action = player.setCurrentTime?.(resumeAt);
        if (action instanceof Promise) void action.catch(() => {});
      }
    };
    const play = () => { playing = true; eventCallback("play", elapsed()); };
    const pause = () => { playing = false; };
    const error = () => { eventCallback("error", elapsed()); };
    const time = (data?: unknown) => {
      if (!validTimeUpdate(data)) return;
      // Two advancing media-time events while playing, not iframe load or play().
      if (playing && lastSeconds !== null && data.seconds > lastSeconds + 0.05 && data.seconds - lastSeconds < 5 && !reportedPlayback) {
        reportedPlayback = true;
        eventCallback("playing", elapsed());
      }
      lastSeconds = data.seconds;
      if (playing && ticket.mode === "standard") progressCallback(Math.min(data.seconds, ticket.durationSeconds));
    };
    const load = () => { eventCallback("load", elapsed()); };
    iframe.addEventListener("load", load);
    player.on("ready", ready);
    player.on("play", play);
    player.on("pause", pause);
    player.on("error", error);
    player.on("timeupdate", time);
    return () => {
      iframe.removeEventListener("load", load);
      destroy();
    };
  }, [sdk, ticket, resumeAt]);

  if (!sdk) return <div className="flex aspect-video items-center justify-center bg-[#080a0f] text-xs text-muted"><LoaderCircle size={18} className="mr-2 animate-spin" />Loading provider player...</div>;
  return <iframe ref={iframeRef} src={ticket.embedUrl} title={title} className="block aspect-video w-full border-0 bg-black" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
}