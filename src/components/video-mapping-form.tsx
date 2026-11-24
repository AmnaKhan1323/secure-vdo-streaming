"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Link2, LoaderCircle } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/api-client";
import { PROVIDER_META, type VideoProvider } from "@/lib/types";
import { Notice, ProviderBadge } from "./ui";

export type MappingLesson = { id: string; title: string; courseTitle: string; mappings: { provider: VideoProvider; assetId: string }[] };

export function VideoMappingForm({ lessons }: { lessons: MappingLesson[] }) {
  const router = useRouter();
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? "");
  const [provider, setProvider] = useState<VideoProvider>("GUMLET");
  const [assetId, setAssetId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lesson = lessons.find((item) => item.id === lessonId);
  const currentAsset = lesson?.mappings.find((mapping) => mapping.provider === provider)?.assetId ?? null;
  const replacing = currentAsset !== null && assetId.trim() !== "" && assetId.trim() !== currentAsset;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || (replacing && !confirmed)) return;
    setBusy(true); setError(null); setMessage(null);
    try {
      const result = await apiClient<{ message: string }>("/api/admin/videos", { lessonId, provider, assetId: assetId.trim(), expectedAssetId: currentAsset });
      setMessage(result.message);
      setConfirmed(false);
      router.refresh();
    } catch (failure) {
      if (failure instanceof ClientApiError && failure.code === "MAPPING_CONFLICT") { setConfirmed(false); router.refresh(); }
      setError(failure instanceof Error ? failure.message : "Video linking failed.");
    } finally { setBusy(false); }
  }

  return <section className="panel p-5" aria-label="Video mappings">
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Link2 size={16} className="text-violet-300" />Link test videos</h2>
    <p className="mb-5 text-xs leading-6 text-muted">Upload the same authorized file in Gumlet and Bunny Stream, wait for encoding, then link their real IDs to the same lesson. Uploads stay in the provider consoles.</p>
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-xs text-muted">Test lesson
        <select className="input mt-2" value={lessonId} disabled={busy || !lessons.length} onChange={(event) => { setLessonId(event.target.value); setConfirmed(false); setMessage(null); setError(null); }}>
          {!lessons.length && <option value="">No test lesson available</option>}
          {lessons.map((item) => <option key={item.id} value={item.id}>{item.courseTitle} / {item.title}</option>)}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="text-xs text-muted">Provider
          <select className="input mt-2" disabled={busy} value={provider} onChange={(event) => { setProvider(event.target.value as VideoProvider); setAssetId(""); setConfirmed(false); setMessage(null); setError(null); }}>
            <option value="GUMLET">Gumlet</option><option value="BUNNY">Bunny Stream</option>
          </select>
        </label>
        <label className="text-xs text-muted">{provider === "GUMLET" ? "Gumlet asset ID" : "Bunny video GUID"}
          <input className="input mt-2" required disabled={busy} value={assetId} maxLength={64} placeholder="Paste the real provider video ID" onChange={(event) => { setAssetId(event.target.value); setConfirmed(false); }} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3 text-[10px]">{(["GUMLET", "BUNNY"] as const).map((item) => <span key={item} className="flex items-center gap-2"><ProviderBadge provider={item} /><span className="break-all text-muted">{lesson?.mappings.find((mapping) => mapping.provider === item)?.assetId ?? "Not linked"}</span></span>)}</div>
      {replacing && <Notice><label className="flex items-start gap-2"><input type="checkbox" disabled={busy} checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 accent-violet-400" /><span>Replace the existing {PROVIDER_META[provider].name} mapping. Playback authorization is rechecked against the new revision.</span></label></Notice>}
      <button className="btn-primary text-xs" disabled={busy || !lesson || (replacing && !confirmed)}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Link2 size={14} />}Verify & link video</button>
    </form>
    {message && <div className="mt-4"><Notice tone="success">{message}</Notice></div>}
    {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
  </section>;
}