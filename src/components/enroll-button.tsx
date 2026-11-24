"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Notice } from "./ui";
import { apiClient } from "@/lib/api-client";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enroll() {
    setBusy(true); setError(null);
    try { await apiClient("/api/enrollments", { courseId }); router.refresh(); }
    catch (error) { setError(error instanceof Error ? error.message : "Enrollment failed."); }
    finally { setBusy(false); }
  }
  return <div><button onClick={enroll} disabled={busy} className="btn-primary w-full">{busy ? <LoaderCircle size={16} className="animate-spin" /> : <>Enroll in this course <ArrowRight size={15} /></>}</button>{error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}</div>;
}