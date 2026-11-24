"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Link2, LoaderCircle, RefreshCw, Upload, Video } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ClientApiError } from "@/lib/api-client";
import { PROVIDER_META, type ProviderAsset, type VideoProvider } from "@/lib/types";
import { cn, formatDuration } from "@/lib/utils";
import { Badge, Notice } from "./ui";

export type AdminLesson = { id: string; title: string; courseTitle: string; mappings: { provider: VideoProvider; assetId: string }[] };
type Catalog = { assets: ProviderAsset[]; total: number; page: number; pageSize: number };

export function AdminVideoManager({ lessons, approvedHosts }: { lessons: AdminLesson[]; approvedHosts: string[] }) {
  const router = useRouter();
  const [tab, setTab] = useState("link");
  const [provider, setProvider] = useState<VideoProvider>("GUMLET");
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [assetId, setAssetId] = useState("");
  const [confirmedReplacement, setConfirmedReplacement] = useState(false);
  const [updatedLinks, setUpdatedLinks] = useState<Record<string, string>>({});
  const [catalog, setCatalog] = useState<(Catalog & { provider: VideoProvider }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const catalogRequest = useRef<AbortController | null>(null);
  const selectedLesson = lessons.find((lesson) => lesson.id === lessonId);
  const currentAsset = updatedLinks[`${provider}:${lessonId}`] ?? selectedLesson?.mappings.find((mapping) => mapping.provider === provider)?.assetId ?? null;
  const replacing = currentAsset !== null && assetId.trim() !== "" && currentAsset !== assetId.trim();

  useEffect(() => () => catalogRequest.current?.abort(), []);

  async function browse(page = 1) {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setBusy(true);
    setError(null);
    try {
      const result = await apiClient<Catalog>(`/api/admin/videos/catalog?provider=${provider}&page=${page}`, undefined, { signal: controller.signal });
      if (!controller.signal.aborted) setCatalog({ ...result, provider });
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Catalog request failed.");
    } finally {
      if (catalogRequest.current === controller) setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (replacing && !confirmedReplacement) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      if (tab === "link") {
        const result = await apiClient<{ lessonId: string; provider: VideoProvider; asset: ProviderAsset; message: string }>("/api/admin/videos", { provider, lessonId, assetId: assetId.trim(), expectedAssetId: currentAsset });
        setUpdatedLinks((previous) => ({ ...previous, [`${result.provider}:${result.lessonId}`]: result.asset.id }));
        setConfirmedReplacement(false);
        setMessage(result.message);
        router.refresh();
      } else {
        const result = await apiClient<{ message: string; assetId: string | null }>("/api/admin/videos/import", { provider, title: String(form.get("title") ?? ""), sourceUrl: String(form.get("sourceUrl") ?? "") });
        setMessage(result.message);
        if (result.assetId) setAssetId(result.assetId);
      }
    } catch (failure) {
      if (failure instanceof ClientApiError && failure.code === "MAPPING_CONFLICT") {
        setUpdatedLinks((previous) => {
          const next = { ...previous };
          delete next[`${provider}:${lessonId}`];
          return next;
        });
        setConfirmedReplacement(false);
        router.refresh();
      }
      setError(failure instanceof Error ? failure.message : "Video request failed.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="panel p-5">
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <Video size={18} className="text-violet-300" />
      <h2 className="text-base font-semibold">Your video library</h2>
      <Badge className="ml-auto">REAL PROVIDER ASSETS</Badge>
    </div>
    <div className="mb-5 flex flex-wrap gap-1 border-b border-border pb-3">
      {[{ id: "link", label: "Link an existing video" }, { id: "import", label: "Import from a media URL" }].map((item) => <button key={item.id} disabled={busy} onClick={() => { setTab(item.id); setError(null); setMessage(null); }} aria-pressed={tab === item.id} className={cn("rounded-lg px-3 py-2 text-xs disabled:opacity-50", tab === item.id ? "bg-violet-400/10 text-violet-200" : "text-muted")}>{item.label}</button>)}
    </div>
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-[11px] text-muted">Provider
          <select className="input mt-2" disabled={busy} value={provider} onChange={(event) => { catalogRequest.current?.abort(); setProvider(event.target.value as VideoProvider); setCatalog(null); setAssetId(""); setConfirmedReplacement(false); setMessage(null); setError(null); }}>
            <option value="GUMLET">Gumlet</option><option value="BUNNY">Bunny Stream</option>
          </select>
        </label>
        {tab === "link" && <label className="text-[11px] text-muted">Lesson
          <select className="input mt-2" disabled={busy} required value={lessonId} onChange={(event) => { setLessonId(event.target.value); setConfirmedReplacement(false); setMessage(null); }}>
            {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.courseTitle} / {lesson.title}</option>)}
          </select>
        </label>}
      </div>
      {tab === "link" ? <>
        <label className="block text-[11px] text-muted">{provider === "GUMLET" ? "Gumlet asset ID (24 hexadecimal characters)" : "Bunny video GUID"}
          <input className="input mt-2" disabled={busy} required value={assetId} onChange={(event) => { setAssetId(event.target.value); setConfirmedReplacement(false); }} placeholder={provider === "GUMLET" ? "Copy the real asset ID from Gumlet" : "Copy the real video GUID from Bunny"} />
        </label>
        <p className="text-[10px] text-muted">Currently linked: {currentAsset ?? "No video for this provider"}. IDs are verified against the real configured workspace/library before saving.</p>
        {replacing && <Notice>
          <label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={confirmedReplacement} onChange={(event) => setConfirmedReplacement(event.target.checked)} className="mt-0.5 accent-violet-400" /><span>Replace the existing video mapping for this lesson and provider. Old playback sessions will not be allowed to save progress for the replacement video.</span></label>
        </Notice>}
      </> : <>
        <label className="block text-[11px] text-muted">Video title<input className="input mt-2" disabled={busy} name="title" required maxLength={160} placeholder="A clear title for this lesson video" /></label>
        <label className="block text-[11px] text-muted">Direct HTTPS source URL<input className="input mt-2" disabled={busy} name="sourceUrl" type="url" required placeholder="https://your-approved-media-host.example/lesson.mp4" /></label>
        <Notice>{approvedHosts.length ? `Approved source hosts: ${approvedHosts.join(", ")}. Only direct HTTPS URLs without query parameters or embedded credentials are accepted.` : "Imports are disabled until VIDEO_IMPORT_ALLOWED_HOSTS is configured on the server. Use only trusted public source hosts you control."}{provider === "BUNNY" && " Bunny's fetch API returns a status, not a documented video GUID. After import, select the resulting video from the real catalog."}</Notice>
      </>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary text-xs" disabled={busy || (tab === "link" ? !lessonId || (replacing && !confirmedReplacement) : !approvedHosts.length)}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : tab === "link" ? <Link2 size={14} /> : <Upload size={14} />}{tab === "link" ? "Verify & link video" : "Import to provider"}</button>
        <button type="button" onClick={() => void browse()} disabled={busy} className="btn-secondary text-xs"><RefreshCw size={13} />Browse provider catalog</button>
      </div>
    </form>
    <p className="mt-4 text-[10px] leading-5 text-muted">Or upload your authorized file directly in each provider&apos;s console and link the resulting real IDs. No provider credential or origin secret should be put in a video title or URL.</p>
    {message && <div className="mt-4"><Notice tone="success">{message}</Notice></div>}
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
    {catalog && catalog.provider === provider && <div className="mt-6 border-t border-border pt-5">
      <div className="mb-4 flex items-center justify-between"><h3 className="text-xs font-semibold">{PROVIDER_META[provider].name} · {catalog.total} real assets</h3><span className="text-[10px] text-muted">Page {catalog.page}</span></div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {catalog.assets.length ? catalog.assets.map((asset) => <button type="button" key={asset.id} disabled={busy} onClick={() => { setAssetId(asset.id); setTab("link"); setConfirmedReplacement(false); }} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised p-3 text-left hover:border-violet-400/40 disabled:opacity-50">
          <div className="min-w-0"><p className="truncate text-xs font-medium">{asset.title}</p><p className="mt-1 break-all text-[9px] text-muted">{asset.id}</p></div>
          <div className="shrink-0 text-right"><Badge tone={asset.ready ? "green" : "amber"}>{asset.status}</Badge><p className="mt-1 text-[9px] text-muted">{formatDuration(asset.durationSeconds)}</p></div>
        </button>) : <p className="py-4 text-xs text-muted">No assets returned on this provider page.</p>}
      </div>
      <div className="mt-4 flex justify-between"><button disabled={busy || catalog.page <= 1} className="btn-secondary text-[10px]" onClick={() => void browse(catalog.page - 1)}><ArrowLeft size={12} />Previous</button><button disabled={busy || catalog.page * catalog.pageSize >= catalog.total} className="btn-secondary text-[10px]" onClick={() => void browse(catalog.page + 1)}>Next <ArrowRight size={12} /></button></div>
    </div>}
  </section>;
}