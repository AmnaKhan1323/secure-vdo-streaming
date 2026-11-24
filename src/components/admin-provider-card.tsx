"use client";

import { useState, type FormEvent } from "react";
import { Check, KeyRound, LoaderCircle, Settings2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { PROVIDER_META, type ProtectionReport, type ProviderSettingsView } from "@/lib/types";
import { Badge, Notice, ProviderBadge } from "./ui";

export function AdminProviderCard({ settings }: { settings: ProviderSettingsView }) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [ttl, setTtl] = useState(settings.ttlSeconds);
  const [domains, setDomains] = useState(settings.allowedDomains.join(", "));
  const [applyRemote, setApplyRemote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProtectionReport | null>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null); setMessage(null); setReport(null);
    try {
      const result = await apiClient<{ report: ProtectionReport | null }>(`/api/admin/providers/${settings.provider}`, { enabled, ttlSeconds: ttl, allowedDomains: domains.split(",").map((value) => value.trim()).filter(Boolean), applyRemote }, { method: "PUT" });
      setReport(result.report); setMessage(applyRemote ? "Settings saved and documented protection changes applied. Review the live report and verify actual playback." : "Local policy saved. Remote provider security still needs to be configured and checked.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Provider configuration failed."); }
    finally { setBusy(false); }
  }
  async function verify() {
    setBusy(true); setError(null); setMessage(null); setReport(null);
    try { const result = await apiClient<{ report: ProtectionReport }>(`/api/admin/providers/${settings.provider}/verify`, {}); setReport(result.report); setMessage("Live configuration retrieved. This does not prove actual browser playback or token rejection."); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The provider could not be verified."); }
    finally { setBusy(false); }
  }
  return <section className="panel p-5"><div className="mb-5 flex items-center justify-between"><ProviderBadge provider={settings.provider} /><Badge tone={settings.configured ? "green" : "amber"}>{settings.configured ? "Keys present · Not verified" : "Credentials required"}</Badge></div><h2 className="text-base font-semibold">{PROVIDER_META[settings.provider].name} configuration</h2><p className="mb-5 mt-2 text-[11px] leading-5 text-muted">{settings.provider === "GUMLET" ? "Workspace API, signed iframe URLs, and whitelist referrers." : "Stream API, embed authentication, and linked Pull Zone security."}</p>{!settings.configured && <div className="mb-5"><Notice><span className="mb-2 flex items-center gap-1.5"><KeyRound size={12} />Set these server environment variables privately:</span><span className="break-words text-[10px] text-violet-200">{settings.missing.join(", ")}</span></Notice></div>}
    <form className="space-y-4" onSubmit={save}><div className="flex items-center justify-between rounded-xl bg-surface-raised p-3"><label htmlFor={`enable-${settings.provider}`} className="text-xs">Allow authorized playback</label><input id={`enable-${settings.provider}`} type="checkbox" className="h-4 w-4 accent-violet-400" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} /></div><div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]"><label className="text-[11px] text-muted">Token TTL (seconds)<input className="input mt-2" type="number" min={60} max={3600} required value={ttl} onChange={(event) => setTtl(Number(event.target.value))} /></label><label className="text-[11px] text-muted">Allowed hostnames<input className="input mt-2" required placeholder="localhost, courses.example.com" value={domains} onChange={(event) => setDomains(event.target.value)} /></label></div><label className="flex items-start gap-2 text-[10px] leading-5 text-muted"><input className="mt-1 h-3.5 w-3.5 shrink-0 accent-violet-400" type="checkbox" checked={applyRemote} disabled={!settings.configured} onChange={(event) => setApplyRemote(event.target.checked)} /><span>Also apply the documented provider protection settings to this real workspace/library. This changes shared provider configuration.</span></label>{applyRemote && <Notice>{settings.provider === "GUMLET" ? "Enables signed URLs and replaces whitelist referrers. Disable the download button manually in Gumlet; that update field is not documented. Inspect existing assets for MP4 generation." : "Enables embed and Pull Zone tokens, blocks missing referrers, and disables direct play, MP4 fallback, and original exposure. Adds allowed domains without removing existing ones. No keys are rotated."}</Notice>}<div className="flex flex-wrap gap-2"><button className="btn-primary text-xs" disabled={busy}>{busy ? <LoaderCircle size={13} className="animate-spin" /> : <Settings2 size={13} />}Save settings</button><button type="button" className="btn-secondary text-xs" onClick={verify} disabled={busy || !settings.configured}><ShieldCheck size={13} />Check live configuration</button></div></form>
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}{message && <div className="mt-4"><Notice tone="success">{message}</Notice></div>}
    {report && <div className="mt-5 border-t border-border pt-4"><p className="eyebrow mb-3">Remote settings · {new Date(report.checkedAt).toLocaleTimeString()}</p><div className="space-y-2">{[{ label: "Signed / embed authentication", value: report.signedPlayback }, { label: "Underlying media token protection", value: report.cdnTokens }, { label: "Download controls disabled", value: report.downloadsDisabled }, { label: "Configured player host matches", value: report.playerHostMatches }, { label: "Signing key matches remote key", value: report.keyMatches }].map(({ label, value }) => <div className="flex justify-between gap-4 text-[10px]" key={label}><span className="text-muted">{label}</span><span className={value === true ? "text-emerald-300" : "text-amber-200"}>{value === true ? <span className="inline-flex items-center gap-1"><Check size={10} />Enabled / matches</span> : value === null ? "Not verifiable" : "Needs attention"}</span></div>)}</div><p className="mt-3 break-words text-[10px] leading-5 text-muted">Remote allowed domains: {report.allowedDomains.join(", ") || "No enforced allowlist detected"}</p>{report.warnings.map((warning) => <p key={warning} className="mt-2 text-[9px] leading-5 text-amber-100/75">{warning}</p>)}</div>}
  </section>;
}