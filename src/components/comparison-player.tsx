"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle, LockKeyhole, Play, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { conservativeTokenLifetime } from "@/lib/playback-clock";
import { nextMeasurementOutcome } from "@/lib/measurement-state";
import { PROVIDER_META, type PlaybackMetrics, type PlaybackMode, type PlaybackTicket, type VideoProvider } from "@/lib/types";
import { formatMilliseconds } from "@/lib/utils";
import { Badge, Notice, ProviderBadge } from "./ui";
import { TrustedIframe } from "./trusted-iframe";
import type { PlayerObservation } from "@/lib/player-observer";

type Props = {
  lessonId: string;
  title: string;
  provider: VideoProvider;
  mapped: boolean;
  enabled: boolean;
  isAdmin: boolean;
  mode: PlaybackMode;
  ttlSeconds?: number;
  runKey: number;
  onMeasurement: (provider: VideoProvider, metrics: PlaybackMetrics, ticket?: PlaybackTicket) => void;
};

export function ComparisonPlayer(props: Props) {
  const [run, setRun] = useState(props.runKey);
  const canStart = props.mapped && props.enabled;
  const renew = () => setRun(Date.now());
  return <section className="panel overflow-hidden" aria-label={`${PROVIDER_META[props.provider].name} player`}>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3"><ProviderBadge provider={props.provider} /><Badge tone={props.provider === "GUMLET" ? "violet" : "blue"}>{props.mode === "standard" ? "SIGNED PLAYBACK" : `${props.mode} probe`}</Badge></div>
    {run && canStart ? <PlaybackSession key={run} {...props} renew={renew} /> : <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] px-5 text-center">
      <span className="mb-4 rounded-2xl border border-violet-400/20 bg-violet-400/10 p-4 text-violet-300">{canStart ? <Play size={22} /> : <LockKeyhole size={22} />}</span>
      <h3 className="text-sm font-semibold">{!props.mapped ? "A real video is needed first." : !props.enabled ? "Provider setup is required." : "Ready for a playback test."}</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-muted">{!props.mapped ? `No ${PROVIDER_META[props.provider].name} video has been linked to this lesson.` : "Playback checks your current session, enrollment, video readiness, and provider protection. No demo stream is used."}</p>
      {canStart ? <button className="btn-primary mt-4 text-xs" onClick={renew}>Test this provider <Play size={13} /></button> : props.isAdmin ? <Link href="/admin" className="btn-secondary mt-4 text-xs">Provider setup</Link> : <p className="mt-3 text-[10px] text-muted">Ask an administrator to finish the provider setup.</p>}
    </div>}
    <p className="border-t border-border px-4 py-3 text-[9px] text-muted">{PROVIDER_META[props.provider].signature} · Authenticated and enrolled viewers only</p>
  </section>;
}

function PlaybackSession({ renew, ...props }: Props & { renew: () => void }) {
  const [issued, setIssued] = useState<{ ticket: PlaybackTicket; roundTripMs: number; receivedAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notify = useEffectEvent((metrics: PlaybackMetrics, ticket?: PlaybackTicket) => props.onMeasurement(props.provider, metrics, ticket));
  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    apiClient<PlaybackTicket>("/api/playback", { lessonId: props.lessonId, provider: props.provider, mode: props.mode, ...(props.ttlSeconds !== undefined ? { ttlSeconds: props.ttlSeconds } : {}) }, { signal: controller.signal })
      .then((ticket) => { if (!controller.signal.aborted) { const roundTripMs = performance.now() - started; notify({ outcome: "issued", tokenRequestMs: roundTripMs }, ticket); setIssued({ ticket, roundTripMs, receivedAt: Date.now() }); } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Playback authorization failed."); notify({ outcome: "error", tokenRequestMs: performance.now() - started }); } });
    return () => controller.abort();
  }, [props.lessonId, props.provider, props.mode, props.ttlSeconds]);
  if (error) return <div className="flex aspect-video min-h-52 flex-col items-center justify-center gap-4 bg-[#090c14] p-5"><Notice tone="error">{error}</Notice><button className="btn-secondary text-xs" onClick={renew}><RotateCcw size={13} />Retry authorization</button></div>;
  if (!issued) return <div className="flex aspect-video min-h-52 items-center justify-center gap-2 bg-[#090c14] p-5 text-xs text-muted"><LoaderCircle size={20} className="animate-spin text-violet-300" />Checking access and provider protection…</div>;
  return <ActivePlayback {...props} {...issued} renew={renew} />;
}

function ActivePlayback({ ticket, roundTripMs, receivedAt, renew, ...props }: Props & { ticket: PlaybackTicket; roundTripMs: number; receivedAt: number; renew: () => void }) {
  const lifetime = conservativeTokenLifetime(ticket.expiresAt, ticket.serverNow, roundTripMs);
  const deadline = receivedAt + lifetime;
  const [remaining, setRemaining] = useState(Math.floor(lifetime / 1000));
  const [expired, setExpired] = useState(false);
  const [metrics, setMetrics] = useState<PlaybackMetrics>({ outcome: "issued", tokenRequestMs: roundTripMs });
  const [saveError, setSaveError] = useState(false);
  const current = useRef(metrics);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const notify = useEffectEvent((value: PlaybackMetrics) => props.onMeasurement(ticket.provider, value, ticket));

  function record(next: Partial<PlaybackMetrics>) {
    const value = { ...current.current, ...next, outcome: nextMeasurementOutcome(current.current.outcome, next.outcome ?? current.current.outcome) };
    current.current = value;
    setMetrics(value);
    queue.current = queue.current.then(() => apiClient(`/api/measurements/${ticket.attemptId}`, value, { keepalive: true })).catch(() => setSaveError(true));
  }
  const recordFromEffect = useEffectEvent(record);
  useEffect(() => { notify(metrics); }, [metrics]);
  useEffect(() => {
    recordFromEffect({ tokenRequestMs: roundTripMs });
    let reachedDeadline = false;
    const check = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds && ticket.mode === "standard" && !reachedDeadline) { reachedDeadline = true; setExpired(true); recordFromEffect({ outcome: "expired", errorCode: "CLIENT_EXPIRED" }); }
    };
    check();
    const clock = window.setInterval(check, 1000);
    const expiry = window.setTimeout(check, Math.max(0, deadline - Date.now()));
    const readiness = window.setTimeout(() => { if (current.current.readyMs === undefined && current.current.outcome !== "error" && !reachedDeadline) recordFromEffect({ outcome: "timeout", errorCode: "PLAYER_TIMEOUT" }); }, 25_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { window.clearInterval(clock); window.clearTimeout(expiry); window.clearTimeout(readiness); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, [ticket, deadline, roundTripMs]);

  function observed(event: PlayerObservation, ms: number) {
    if (event === "load" && current.current.iframeLoadMs === undefined) record({ iframeLoadMs: ms });
    if (event === "ready" && current.current.readyMs === undefined) record({ readyMs: ms, outcome: "ready" });
    if (event === "playing" && current.current.firstFrameMs === undefined) record({ firstFrameMs: ms, outcome: "playing" });
    if (event === "error") record({ outcome: "error", errorCode: "PLAYER_ERROR" });
  }

  return <>
    {expired ? <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] p-5 text-center"><Clock3 size={27} className="mb-3 text-violet-300" /><h3 className="text-sm font-semibold">This playback session has expired.</h3><p className="mt-2 max-w-sm text-xs leading-5 text-muted">The app removed the player. Renew to recheck access. This does not prove provider-side expiry rejection.</p><button className="btn-primary mt-4 text-xs" onClick={renew}><RotateCcw size={13} />Renew session</button></div> : <TrustedIframe ticket={ticket} title={props.title} onEvent={observed} />}
    <div className="flex flex-wrap justify-between gap-2 border-t border-border px-4 py-3 text-[10px]"><span className="text-muted">{ticket.mode === "expired" ? "Already-expired token probe" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} token window remaining`}</span><button className="text-violet-300" onClick={renew}>New session</button></div>
    <div className="grid grid-cols-3 gap-3 border-t border-border px-4 py-3">{[{ label: "Iframe loaded", value: metrics.iframeLoadMs }, { label: "Player ready", value: metrics.readyMs }, { label: "Playback observed", value: metrics.firstFrameMs }].map((item) => <div key={item.label}><p className="text-[9px] text-muted">{item.label}</p><p className="mt-1 text-xs">{formatMilliseconds(item.value)}</p></div>)}</div>
    {(metrics.outcome === "error" || metrics.outcome === "timeout") && <div className="px-4 pb-3"><Notice tone="error">{metrics.outcome === "timeout" ? "No readiness event within 25 seconds. A hidden tab, network issue, or rejection can cause this; the result is inconclusive." : "The player reported an error. Inspect provider protection and media requests privately."}</Notice></div>}
    {ticket.mode !== "standard" && <div className="px-4 pb-3"><Notice>{metrics.firstFrameMs !== undefined ? "Playback was observed with a negative-test token. Review provider protection." : "Negative-token probe: no playback observation is not proof of provider rejection. Inspect the actual media response."}</Notice></div>}
    {saveError && <div className="px-4 pb-3"><Notice tone="error">Observations could not be saved. The displayed values are local to this browser session.</Notice></div>}
  </>;
}