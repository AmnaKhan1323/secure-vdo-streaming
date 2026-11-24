"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, LoaderCircle, Settings2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PROVIDER_META, type ProtectionReport, type ProviderSettingsView } from "@/lib/types";
import { Badge, Notice, ProviderBadge } from "./ui";

export function AdminProviderCard({ settings }: { settings: ProviderSettingsView }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [ttl, setTtl] = useState(settings.ttlSeconds);
  const [domains, setDomains] = useState(settings.allowedDomains.join(", "));
  const [revision, setRevision] = useState(settings.revision);
  const [applyRemote, setApplyRemote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProtectionReport | null>(null);
  function changed() { setReport(null); setMessage(null); setError(null); }
  function reload() { setEnabled(settings.enabled); setTtl(settings.ttlSeconds); setDomains(settings.allowedDomains.join(", ")); setRevision(settings.revision); changed(); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); changed();
    try {
      const result = await apiClient<{ report: ProtectionReport | null; setting: { revision: number } }>(`/api/admin/providers/${settings.provider}`, { enabled, ttlSeconds: ttl, allowedDomains: domains.split(",").map((value) => value.trim()).filter(Boolean), applyRemote, expectedRevision: revision }, { method: "PUT" });
      setRevision(result.setting.revision);
      setReport(result.report);
      setMessage(applyRemote ? "Policy saved after remote verification. Test actual playback next." : "Local policy saved. Remote protection is checked again on playback.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Provider configuration failed.");
      router.refresh();
    } finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); changed();
    try { const result = await apiClient<{ report: ProtectionReport }>(`/api/admin/providers/${settings.provider}/verify`, {}); setReport(result.report); setMessage("Remote report retrieved. This does not certify video playback or token rejection."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The provider could not be verified."); }
    finally { setBusy(false); }
  }
  return <section className="panel p-5">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><ProviderBadge provider={settings.provider} /><Badge tone={settings.configured ? "blue" : "amber"}>{settings.configured ? "Keys present · Not verified" : "Credentials required"}</Badge></div>
    <h2 className="text-base font-semibold">{PROVIDER_META[settings.provider].name} configuration</h2>
    <p className="mb-5 mt-2 text-[11px] leading-5 text-muted">{settings.provider === "GUMLET" ? "Workspace API, signed iframe URLs, and whitelist referrers." : "Stream API, embed authentication, and linked Pull Zone security."}</p>
    {!settings.configured && <div className="mb-5"><Notice><span className="mb-2 flex items-center gap-1.5"><KeyRound size={12} />Set these server variables privately:</span><span className="break-words text-[10px] text-violet-200">{settings.missing.join(", ")}</span></Notice></div>}
    {settings.configurationState !== "ready" && <div className="mb-4"><Notice tone="error">Playback is blocked while configuration is updating or failed. After failure, fix provider settings and retry Save. Stale operations can be recovered after 10 minutes; enabling them requires a fresh remote report.</Notice></div>}
    {settings.revision !== revision && <div className="mb-4"><Notice>Saved policy changed. <button type="button" onClick={reload} disabled={busy} className="underline">Reload saved settings</button> before saving another update.</Notice></div>}
    <form onSubmit={save}>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
        <div className="flex items-center justify-between rounded-xl bg-surface-raised p-3"><label htmlFor={`enable-${settings.provider}`} className="text-xs">Allow authorized playback</label><input id={`enable-${settings.provider}`} type="checkbox" className="h-4 w-4 accent-violet-400" checked={enabled} onChange={(event) => { changed(); setEnabled(event.target.checked); }} /></div>
        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
          <label className="text-[11px] text-muted">Token TTL (seconds)<input className="input mt-2" type="number" min={60} max={3600} required value={ttl} onChange={(event) => { changed(); setTtl(Number(event.target.value)); }} /></label>
          <label className="text-[11px] text-muted">Allowed hostnames<input className="input mt-2" required placeholder="localhost, courses.example.com" value={domains} onChange={(event) => { changed(); setDomains(event.target.value); }} /></label>
        </div>
        <label className="flex items-start gap-2 text-[10px] leading-5 text-muted"><input className="mt-1 h-3.5 w-3.5 shrink-0 accent-violet-400" type="checkbox" checked={applyRemote} disabled={!settings.configured} onChange={(event) => { changed(); setApplyRemote(event.target.checked); }} /><span>Also apply the documented settings to the real provider scope. This affects shared provider configuration.</span></label>
        {applyRemote && <Notice>{settings.provider === "GUMLET" ? "Enables signed URLs and replaces whitelist referrers. Manually disable the Gumlet download button and inspect existing MP4 assets." : "Enables embed and Pull Zone tokens; blocks missing referrers; disables direct play, early play, MP4 fallback, and original exposure. Adds domains without removing existing ones."} No keys are rotated. Partial failures keep app playback disabled.</Notice>}
        <div className="flex flex-wrap gap-2"><button className="btn-primary text-xs" disabled={busy}>{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Settings2 size={13} />}Save settings</button><button type="button" className="btn-secondary text-xs" onClick={verify} disabled={busy || !settings.configured}><ShieldCheck size={13} />Check live configuration</button></div>
      </fieldset>
    </form>
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
    {message && <div className="mt-4"><Notice tone="success">{message}</Notice></div>}
    {report && <div className="mt-5 border-t border-border pt-4">
      <p className="eyebrow mb-3">Remote report · {new Date(report.checkedAt).toLocaleTimeString()}</p>
      <div className="space-y-2">{[{ label: "Signed / embed authentication", value: report.signedPlayback }, { label: "Underlying media token protection", value: report.cdnTokens }, { label: "Download controls disabled", value: report.downloadsDisabled }, { label: "Configured player host matches", value: report.playerHostMatches }, { label: "Signing key matches remote key", value: report.keyMatches }].map(({ label, value }) => <div className="flex justify-between gap-4 text-[10px]" key={label}><span className="text-muted">{label}</span><span className={value === true ? "text-emerald-300" : "text-amber-200"}>{value === true ? <span className="inline-flex items-center gap-1"><Check size={10} />Enabled / matches</span> : value === null ? "Not verifiable" : "Needs attention"}</span></div>)}</div>
      <p className="mt-3 break-words text-[10px] leading-5 text-muted">Remote allowed domains: {report.allowedDomains.join(", ") || "No enforced allowlist detected"}</p>
      {report.warnings.map((warning) => <p key={warning} className="mt-2 text-[9px] leading-5 text-amber-100/75">{warning}</p>)}
    </div>}
  </section>;
}