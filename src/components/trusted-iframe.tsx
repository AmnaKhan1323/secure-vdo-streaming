"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import type { PlaybackTicket } from "@/lib/types";
import { attachProviderPlayer, type ProviderSdk } from "@/lib/player-sdk";
import { loadProviderSdk, PlayerSetupError } from "@/lib/player-setup";
import { observePlayer, type PlayerObservation } from "@/lib/player-observer";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { Notice } from "./ui";

type Props = { ticket: PlaybackTicket; title: string; onEvent: (event: PlayerObservation, ms: number) => void };

export function TrustedIframe(props: Props) {
  const [attempt, setAttempt] = useState(0);
  return <ProviderFrame key={attempt} {...props} retry={() => setAttempt((value) => value + 1)} />;
}

function ProviderFrame({ ticket, title, onEvent, retry }: Props & { retry: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sdk, setSdk] = useState<ProviderSdk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventCallback = useEffectEvent(onEvent);
  const setupFailed = useEffectEvent((message: string) => { setError(message); eventCallback("error", 0); });

  useEffect(() => {
    const controller = new AbortController();
    loadProviderSdk(ticket.provider, controller.signal).then((loaded) => {
      if (!controller.signal.aborted) setSdk(loaded);
    }).catch((failure) => {
      if (!controller.signal.aborted) setupFailed(failure instanceof PlayerSetupError ? failure.message : "Player setup failed. Retry or request a new session.");
    });
    return () => controller.abort();
  }, [ticket.provider]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !sdk) return;
    const started = performance.now();
    let active = true;
    let attached: ReturnType<typeof attachProviderPlayer> | undefined;
    let observer: ReturnType<typeof observePlayer> | undefined;
    const load = () => eventCallback("load", performance.now() - started);
    try {
      attached = attachProviderPlayer(sdk, iframe);
      observer = observePlayer(attached.player, {
        duration: ticket.durationSeconds,
        elapsed: () => performance.now() - started,
        onEvent: (event, ms) => eventCallback(event, ms),
      });
      iframe.addEventListener("load", load);
    } catch {
      observer?.destroy();
      attached?.destroy();
      // Deliver external initialization failure as a callback, not a synchronous
      // React state mutation during layout synchronization.
      queueMicrotask(() => { if (active) setupFailed("The provider SDK could not initialize. Retry setup or request a new playback session."); });
      return () => { active = false; };
    }
    return () => { active = false; iframe.removeEventListener("load", load); observer?.destroy(); attached?.destroy(); };
  }, [sdk, ticket]);

  if (error) return <div className="flex aspect-video min-h-52 flex-col items-center justify-center gap-4 bg-[#080a0f] p-5"><Notice tone="error">{error}</Notice><button type="button" className="btn-secondary text-xs" onClick={retry}><RotateCcw size={13} />Retry player setup</button></div>;
  if (!sdk) return <div className="flex aspect-video items-center justify-center bg-[#080a0f] text-xs text-muted"><LoaderCircle size={18} className="mr-2 animate-spin" />Loading provider player...</div>;
  return <iframe ref={iframeRef} src={ticket.embedUrl} title={title} className="block aspect-video w-full border-0 bg-black" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />;
}