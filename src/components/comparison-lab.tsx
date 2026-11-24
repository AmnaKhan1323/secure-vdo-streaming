"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, LoaderCircle, Play, ShieldCheck } from "lucide-react";
import { PROVIDERS, PROVIDER_META, type PlaybackMetrics, type PlaybackMode, type PlaybackTicket, type ProviderSettingsView, type VideoProvider } from "@/lib/types";
import { hasProviderPair, type ComparisonLesson } from "@/lib/comparison-lessons";
import { formatMilliseconds } from "@/lib/utils";
import { Badge, Notice, ProviderBadge } from "./ui";
import { SecureVideoPlayer } from "./secure-video-player";

export type { ComparisonLesson } from "@/lib/comparison-lessons";
type Measurement = { ticket?: PlaybackTicket; metrics: PlaybackMetrics };

export function ComparisonLab({ lessons, isAdmin, nonEnrolledLessonId, settings }: { lessons: ComparisonLesson[]; isAdmin: boolean; nonEnrolledLessonId?: string; settings?: ProviderSettingsView[] }) {
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [test, setTest] = useState("standard");
  const [runKey, setRunKey] = useState(0);
  const [measurements, setMeasurements] = useState<Partial<Record<VideoProvider, Measurement>>>({});
  const [gateResult, setGateResult] = useState<string | null>(null);
  const [gateBusy, setGateBusy] = useState(false);
  const lesson = lessons.find((item) => item.id === lessonId);
  const paired = lesson !== undefined && hasProviderPair(lesson);
  const providersConfigured = settings === undefined || PROVIDERS.every((provider) => settings.some((setting) => setting.provider === provider && setting.configured && setting.enabled));
  const canRunPair = paired && providersConfigured;
  const mode: PlaybackMode = test === "expired" || test === "tampered" ? test : "standard";
  function run() { if (canRunPair) { setMeasurements({}); setRunKey(Date.now()); } }
  function measured(provider: VideoProvider, metrics: PlaybackMetrics, ticket?: PlaybackTicket) {
    setMeasurements((previous) => { const same = previous[provider]?.ticket?.attemptId === ticket?.attemptId; return { ...previous, [provider]: { ticket, metrics: same ? { ...previous[provider]?.metrics, ...metrics } : metrics } }; });
  }
  async function testAccess(kind: "auth" | "enrollment") {
    setGateBusy(true); setGateResult(null);
    try {
      const id = kind === "auth" ? lessonId || nonEnrolledLessonId || "unavailable-lesson" : nonEnrolledLessonId;
      if (!id) { setGateResult("Enrollment test needs a published course you have not enrolled in. All current courses are enrolled or empty."); return; }
      const expected = kind === "auth" ? 401 : 403;
      const expectedCode = kind === "auth" ? "UNAUTHENTICATED" : "NOT_ENROLLED";
      const observations = await Promise.all(PROVIDERS.map(async (provider) => {
        const response = await fetch("/api/playback", { method: "POST", credentials: kind === "auth" ? "omit" : "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lessonId: id, provider, mode: "standard" }), cache: "no-store" });
        const result = await response.json();
        return { provider, status: response.status, verified: response.status === expected && result.error?.code === expectedCode && !result.embedUrl };
      }));
      const summary = observations.map((observation) => `${PROVIDER_META[observation.provider].name}: HTTP ${observation.status}`).join("; ");
      setGateResult(observations.every((observation) => observation.verified)
        ? `${kind === "auth" ? "Authentication" : "Enrollment"} gate verified: ${summary}. Both returned ${expectedCode} without a playback URL.`
        : `Access test not verified: ${summary}. Both must return HTTP ${expected} (${expectedCode}) without a playback URL. Check application configuration.`);
    } catch { setGateResult("The access test could not reach the application API. No result is claimed."); }
    finally { setGateBusy(false); }
  }
  return <section className="space-y-5"><div className="panel p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><FlaskConical size={17} className="text-violet-300" />Playback test bench</h2><Badge tone="violet">BROWSER MEASUREMENTS</Badge></div><div className="grid items-end gap-4 md:grid-cols-[minmax(0,1fr)_210px_auto]"><label className="text-[11px] text-muted">Enrolled lesson<select className="input mt-2" value={lessonId} onChange={(event) => { setLessonId(event.target.value); setRunKey(0); setMeasurements({}); }} disabled={!lessons.length}><option value="" disabled>Select an enrolled lesson</option>{lessons.map((item) => <option key={item.id} value={item.id}>{item.courseTitle} / {item.title}{hasProviderPair(item) ? " · Both linked" : " · Mapping required"}</option>)}</select></label><label className="text-[11px] text-muted">Test scenario<select className="input mt-2" value={test} onChange={(event) => { setTest(event.target.value); setRunKey(0); setMeasurements({}); }}><option value="standard">Normal signed playback</option>{isAdmin && <><option value="short">60-second token window</option><option value="expired">Already-expired token</option><option value="tampered">Tampered signature</option></>}</select></label><button className="btn-primary" onClick={run} disabled={!canRunPair}><Play size={14} />Run both providers</button></div><p className="mt-4 text-[10px] leading-5 text-muted">Use the same authorized source video on both providers. Start both players, then press play inside each iframe. Readiness and advancing media time are separate observations; user click delay affects playback timing. Negative-token tests and TTL overrides are admin-only.</p>
      {!canRunPair && <div className="mt-4"><Notice>{!lesson ? <>Enroll in a <Link href="/courses" className="underline underline-offset-4">test course</Link> to select a lesson.</> : !paired ? <>Both real provider videos must be linked to this lesson before a paired run. {isAdmin ? <Link href="/admin" className="underline underline-offset-4">Link videos in provider setup</Link> : "Ask an administrator to link the video on each provider."}</> : "Both providers need private server credentials and must be enabled before a paired run. Remote protection is verified when playback is requested."}</Notice></div>}
    </div>
    {lesson ? <div className="grid gap-5 xl:grid-cols-2">{PROVIDERS.map((provider) => <SecureVideoPlayer key={`${lesson.id}-${test}-${runKey}-${provider}`} lessonId={lesson.id} title={`${lesson.title} · ${provider}`} fixedProvider={provider} availableProviders={lesson.providers} mode={mode} purpose="comparison" ttlSeconds={test === "short" ? 60 : undefined} runKey={runKey} isAdmin={isAdmin} onMeasurement={measured} />)}</div> : <div className="grid gap-5 xl:grid-cols-2">{PROVIDERS.map((provider) => <section className="panel p-5" key={provider} aria-label={`${PROVIDER_META[provider].name} player`}><ProviderBadge provider={provider} /><div className="flex aspect-video flex-col items-center justify-center text-center"><Play size={25} className="mb-4 text-violet-300" /><h3 className="text-sm font-medium">Awaiting an enrolled test lesson</h3><p className="mt-2 max-w-xs text-xs leading-5 text-muted">Real signed playback appears here after enrollment and provider configuration. No demo video is loaded.</p></div></section>)}</div>}
    <div className="panel overflow-hidden"><div className="border-b border-border px-5 py-4"><h3 className="text-sm font-semibold">This run, side by side</h3><p className="mt-1 text-[10px] text-muted">No observation is shown as zero or a successful playback result.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead><tr className="border-b border-border text-muted"><th className="px-5 py-4 font-medium">Observation</th>{(["GUMLET", "BUNNY"] as const).map((provider) => <th className="px-5 py-4" key={provider}><ProviderBadge provider={provider} /></th>)}</tr></thead><tbody>{[{ label: "Token API round trip", field: "tokenRequestMs" }, { label: "Iframe load (not playback)", field: "iframeLoadMs" }, { label: "Player ready", field: "readyMs" }, { label: "Advancing media time", field: "firstFrameMs" }].map(({ label, field }) => <tr key={field} className="border-b border-border/70"><td className="px-5 py-3.5 text-muted">{label}</td>{(["GUMLET", "BUNNY"] as const).map((provider) => <td key={provider} className="px-5 py-3.5 tabular-nums">{formatMilliseconds(measurements[provider]?.metrics[field as keyof Pick<PlaybackMetrics, "tokenRequestMs" | "iframeLoadMs" | "readyMs" | "firstFrameMs">])}</td>)}</tr>)}<tr className="border-b border-border/70"><td className="px-5 py-3.5 text-muted">Server token expiry</td>{(["GUMLET", "BUNNY"] as const).map((provider) => <td key={provider} className="px-5 py-3.5">{measurements[provider]?.ticket ? new Date(measurements[provider]!.ticket!.expiresAt).toLocaleTimeString() : "Not issued"}</td>)}</tr><tr><td className="px-5 py-3.5 text-muted">Last browser observation</td>{(["GUMLET", "BUNNY"] as const).map((provider) => <td key={provider} className="px-5 py-3.5"><Badge tone={measurements[provider]?.metrics.firstFrameMs !== undefined ? "green" : "neutral"}>{measurements[provider]?.metrics.outcome ?? "Not run"}</Badge></td>)}</tr></tbody></table></div></div>
    <section className="panel p-5"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-emerald-300" />Application access controls</h3><div className="flex flex-wrap gap-3"><button className="btn-secondary text-xs" disabled={gateBusy} onClick={() => void testAccess("auth")}>{gateBusy ? <LoaderCircle size={13} className="animate-spin" /> : null}Test without a session</button><button className="btn-secondary text-xs" disabled={gateBusy || !nonEnrolledLessonId} onClick={() => void testAccess("enrollment")}>Test without enrollment</button></div>{gateResult && <div className="mt-4"><Notice>{gateResult}</Notice></div>}<p className="mt-4 text-[10px] leading-5 text-muted">These tests call the real application API. Expiry countdowns demonstrate the application deadline, not provider-side enforcement. Cross-origin media status, CDN segments, and actual token rejection require a credentialed browser test.</p></section>
  </section>;
}