"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { Clock3, LoaderCircle, LockKeyhole, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { conservativeTokenLifetime } from "@/lib/playback-clock";
import { PROVIDER_META, type PlaybackMetrics, type PlaybackMode, type PlaybackTicket, type VideoProvider } from "@/lib/types";
import { cn, formatMilliseconds } from "@/lib/utils";
import { Badge, Notice } from "./ui";
import { TrustedIframe } from "./trusted-iframe";

type PlayerProps = { lessonId: string; title: string; availableProviders: VideoProvider[]; isAdmin?: boolean; resumeAt?: number; fixedProvider?: VideoProvider; mode?: PlaybackMode; purpose?: "lesson" | "comparison"; ttlSeconds?: number; runKey?: number; onMeasurement?: (provider: VideoProvider, metrics: PlaybackMetrics, ticket?: PlaybackTicket) => void };

export function SecureVideoPlayer(props: PlayerProps) {
  const [provider, setProvider] = useState<VideoProvider>(props.fixedProvider ?? props.availableProviders[0] ?? "GUMLET");
  const [run, setRun] = useState<{ key: number; resumeAt: number } | null>(props.runKey ? { key: props.runKey, resumeAt: props.resumeAt ?? 0 } : null);
  const resumeRef = useRef(props.resumeAt ?? 0);
  const selected = props.fixedProvider ?? provider;
  const configured = props.availableProviders.includes(selected);
  function start() { setRun({ key: Date.now(), resumeAt: resumeRef.current }); }
  function switchProvider(next: VideoProvider) { setProvider(next); setRun(null); }
  return <section className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5"><div className="flex items-center gap-2 text-[11px]"><ShieldCheck size={14} className="text-emerald-300" /><span className="font-medium">{props.fixedProvider ? PROVIDER_META[selected].name : "Secure lesson player"}</span></div>{!props.fixedProvider ? <div className="inline-flex gap-1 rounded-lg bg-[#0b0e17] p-1" role="group" aria-label="Streaming provider">{(["GUMLET", "BUNNY"] as const).map((item) => <button key={item} onClick={() => switchProvider(item)} aria-pressed={selected === item} className={cn("rounded-md px-3 py-1.5 text-[10px] font-medium", selected === item ? "bg-[#2d2540] text-violet-200" : "text-muted hover:text-white")}>{PROVIDER_META[item].name}</button>)}</div> : <Badge tone={selected === "GUMLET" ? "violet" : "blue"}>{props.mode && props.mode !== "standard" ? `${props.mode} probe` : "SIGNED EMBED"}</Badge>}</div>
    {run && configured ? <PlaybackSession key={`${selected}-${run.key}`} {...props} provider={selected} resumeAt={run.resumeAt} onPosition={(seconds) => { resumeRef.current = seconds; }} onRenew={start} /> : <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] px-6 text-center"><span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#53416d] bg-[#272033] text-[#b89fff]">{configured ? <Play size={23} /> : <LockKeyhole size={22} />}</span><h3 className="text-sm font-semibold">{configured ? "Your lesson, securely delivered." : "A real video is needed first."}</h3><p className="mt-2 max-w-sm text-xs leading-5 text-muted">{configured ? "Your enrollment and provider protection are verified before a short-lived playback URL is issued." : `No ${PROVIDER_META[selected].name} video has been linked to this lesson. There is no simulated stream or public fallback.`}</p>{configured ? <button className="btn-primary mt-5 min-h-9 px-4 py-2 text-xs" onClick={start}>Start secure playback <Play size={12} /></button> : props.isAdmin ? <Link href="/admin" className="btn-secondary mt-5 text-xs">Configure lesson video</Link> : <p className="mt-4 text-[10px] text-amber-200">Ask an administrator to configure this provider.</p>}</div>}
    <div className="flex flex-wrap justify-between gap-2 border-t border-border bg-[#11151f] px-4 py-3 text-[9px] text-muted"><span className="inline-flex items-center gap-1.5"><LockKeyhole size={11} />Authenticated + enrolled viewers only</span><span>{PROVIDER_META[selected].signature}</span></div>
  </section>;
}

function PlaybackSession({ provider, onPosition, onRenew, ...props }: PlayerProps & { provider: VideoProvider; onPosition: (seconds: number) => void; onRenew: () => void }) {
  const [issuedSession, setIssuedSession] = useState<{ ticket: PlaybackTicket; tokenRequestMs: number; receivedAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const measure = useEffectEvent((metrics: PlaybackMetrics, issued?: PlaybackTicket) => props.onMeasurement?.(provider, metrics, issued));
  useEffect(() => {
    const controller = new AbortController();
    const started = performance.now();
    apiClient<PlaybackTicket>("/api/playback", { lessonId: props.lessonId, provider, mode: props.mode ?? "standard", purpose: props.purpose ?? "lesson", ...(props.ttlSeconds !== undefined ? { ttlSeconds: props.ttlSeconds } : {}) }, { signal: controller.signal })
      .then((issued) => { if (!controller.signal.aborted) { const tokenRequestMs = performance.now() - started; measure({ tokenRequestMs, outcome: "issued" }, issued); setIssuedSession({ ticket: issued, tokenRequestMs, receivedAt: Date.now() }); } })
      .catch((failure) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "Playback request failed."); measure({ tokenRequestMs: performance.now() - started, outcome: "error" }); } });
    return () => controller.abort();
  }, [props.lessonId, provider, props.mode, props.purpose, props.ttlSeconds]);
  if (error) return <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] px-5"><div className="max-w-md"><Notice tone="error">{error}</Notice></div><button onClick={onRenew} className="btn-secondary mt-4 text-xs"><RotateCcw size={13} />Retry authorization</button></div>;
  if (!issuedSession) return <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] text-center"><LoaderCircle size={25} className="mb-4 animate-spin text-violet-300" /><p className="text-xs text-muted">Checking enrollment, asset readiness, and provider protection...</p></div>;
  return <ActivePlayback ticket={issuedSession.ticket} tokenRequestMs={issuedSession.tokenRequestMs} receivedAt={issuedSession.receivedAt} {...props} onPosition={onPosition} onRenew={onRenew} />;
}

function ActivePlayback({ ticket, tokenRequestMs, receivedAt, title, lessonId, purpose = "lesson", resumeAt = 0, onPosition, onRenew, onMeasurement }: PlayerProps & { ticket: PlaybackTicket; tokenRequestMs: number; receivedAt: number; onPosition: (seconds: number) => void; onRenew: () => void }) {
  const lifetime = conservativeTokenLifetime(ticket.expiresAt, ticket.serverNow, tokenRequestMs);
  const deadline = receivedAt + lifetime;
  const [remaining, setRemaining] = useState(Math.floor(lifetime / 1000));
  const [expired, setExpired] = useState(false);
  const [metrics, setMetrics] = useState<PlaybackMetrics>({ outcome: "issued", tokenRequestMs });
  const [saveError, setSaveError] = useState<string | null>(null);
  const metricsRef = useRef<PlaybackMetrics>({ outcome: "issued", tokenRequestMs });
  const lastProgressSave = useRef(0);
  const progressSequence = useRef(0);
  const progressQueue = useRef<Promise<unknown>>(Promise.resolve());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const notify = useEffectEvent((next: PlaybackMetrics) => onMeasurement?.(ticket.provider, next, ticket));

  function record(next: Partial<PlaybackMetrics>) {
    const updated: PlaybackMetrics = { ...metricsRef.current, ...next };
    metricsRef.current = updated;
    setMetrics(updated);
    // Serialize writes to keep late ready/load reports from overwriting playback.
    queue.current = queue.current.then(() => apiClient(`/api/measurements/${ticket.attemptId}`, updated, { keepalive: true })).catch(() => { setSaveError("Measurement persistence failed. Displayed values are local to this browser session."); });
  }
  const recordFromEffect = useEffectEvent(record);
  useEffect(() => { notify(metrics); }, [metrics]);

  useEffect(() => {
    recordFromEffect({ tokenRequestMs });
    let expiredOnce = false;
    const checkDeadline = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && ticket.mode === "standard" && !expiredOnce) { expiredOnce = true; setExpired(true); recordFromEffect({ outcome: "expired", errorCode: "CLIENT_EXPIRED" }); }
    };
    checkDeadline();
    const timer = window.setInterval(checkDeadline, 1000);
    const exactDeadline = window.setTimeout(checkDeadline, Math.max(0, deadline - Date.now()));
    document.addEventListener("visibilitychange", checkDeadline);
    window.addEventListener("focus", checkDeadline);
    const readinessTimeout = window.setTimeout(() => {
      if (metricsRef.current.readyMs === undefined && metricsRef.current.outcome !== "error" && !expiredOnce) recordFromEffect({ outcome: "timeout", errorCode: "PLAYER_TIMEOUT" });
    }, 25_000);
    return () => { window.clearInterval(timer); window.clearTimeout(exactDeadline); window.clearTimeout(readinessTimeout); document.removeEventListener("visibilitychange", checkDeadline); window.removeEventListener("focus", checkDeadline); };
  }, [ticket, deadline, tokenRequestMs]);

  function playerEvent(event: "load" | "ready" | "play" | "playing" | "error", ms: number) {
    const current = metricsRef.current;
    if (event === "load" && current.iframeLoadMs === undefined) record({ iframeLoadMs: ms });
    if (event === "ready" && current.readyMs === undefined) record({ readyMs: ms, outcome: current.outcome === "playing" ? "playing" : "ready" });
    if (event === "playing" && current.firstFrameMs === undefined) record({ firstFrameMs: ms, outcome: "playing" });
    if (event === "error") record({ outcome: "error", errorCode: "PLAYER_ERROR" });
  }
  function progress(seconds: number) {
    onPosition(seconds);
    if (purpose !== "lesson") return;
    if (performance.now() - lastProgressSave.current < 10_000) return;
    lastProgressSave.current = performance.now();
    const sequence = ++progressSequence.current;
    progressQueue.current = progressQueue.current.then(() => apiClient("/api/progress", { lessonId, attemptId: ticket.attemptId, sequence, positionSeconds: seconds })).catch(() => { setSaveError("Progress could not be saved. Sign in again or renew your playback session."); });
  }
  return <>
    {expired ? <div className="flex aspect-video min-h-52 flex-col items-center justify-center bg-[#090c14] px-6 text-center"><Clock3 size={30} className="mb-4 text-violet-300" /><h3 className="text-sm font-semibold">This playback session has expired.</h3><p className="mt-2 max-w-sm text-xs leading-5 text-muted">The application removed the player at its configured deadline. Renew to recheck enrollment and request a fresh token. This is not proof of provider-side rejection.</p><button className="btn-primary mt-5 text-xs" onClick={onRenew}><RotateCcw size={14} />Renew session</button></div> : <TrustedIframe ticket={ticket} title={title} resumeAt={resumeAt} onEvent={playerEvent} onProgress={progress} />}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[10px] text-muted"><Clock3 size={12} />{ticket.mode === "expired" ? "Already-expired token probe" : `Token window · ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} remaining`}</span><button onClick={onRenew} className="inline-flex items-center gap-1.5 text-[10px] text-violet-300"><RotateCcw size={11} />New session</button></div><div className="grid grid-cols-3 gap-3 border-t border-border bg-[#10141d] px-4 py-3">{[{ title: "Iframe loaded", value: metrics.iframeLoadMs }, { title: "Player ready", value: metrics.readyMs }, { title: "Playback observed", value: metrics.firstFrameMs }].map((item) => <div key={item.title}><p className="text-[8px] uppercase tracking-wider text-muted">{item.title}</p><p className="mt-1 text-[11px] font-medium">{formatMilliseconds(item.value)}</p></div>)}</div>
    {(metrics.outcome === "error" || metrics.outcome === "timeout") && <div className="px-4 pb-3"><Notice tone="error">{metrics.outcome === "timeout" ? "No player readiness event was observed within 25 seconds. This may be a provider rejection, network issue, or background-tab delay—not a verified security result." : "The real provider reported a player error. Check the token, domain allowlist, asset status, and provider console."}</Notice></div>}
    {ticket.mode !== "standard" && <div className="px-4 pb-3"><Notice>{metrics.firstFrameMs !== undefined ? "Playback was observed with a negative-test token. Review provider protection before publishing." : "Negative test: an iframe load, timeout, or token issuance is not proof of rejection. Verify the provider error and media requests in browser tools."}</Notice></div>}
    {saveError && <div className="px-4 pb-3"><Notice tone="error">{saveError}</Notice></div>}
  </>;
}