"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, LockKeyhole } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { Badge, Notice } from "./ui";

export type TestCourseAccess = { id: string; title: string; enrolled: boolean; canEnroll: boolean };

export function CourseAccess({ courses }: { courses: TestCourseAccess[] }) {
  const router = useRouter();
  const [courseId, setCourseId] = useState(courses.find((course) => course.enrolled)?.id ?? courses[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrolledId, setEnrolledId] = useState<string | null>(null);
  const course = courses.find((item) => item.id === courseId);
  const enrolled = course?.enrolled || enrolledId === courseId;

  async function enroll() {
    if (!course?.canEnroll || busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient("/api/enrollments", { courseId });
      setEnrolledId(courseId);
      router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Enrollment failed."); }
    finally { setBusy(false); }
  }

  return <section id="course-access" className="panel mb-5 p-5" aria-label="Course access">
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><LockKeyhole size={15} className="text-violet-300" />Course access</h2>
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1 text-xs text-muted">
        <label htmlFor="test-course-selection">Test course</label>
        <select id="test-course-selection" className="input mt-2" value={courseId} disabled={busy || !courses.length} onChange={(event) => { setCourseId(event.target.value); setError(null); }}>
          {!courses.length && <option value="">No test courses available</option>}
          {courses.map((item) => <option key={item.id} value={item.id}>{item.title}{item.enrolled ? " · Enrolled" : ""}</option>)}
        </select>
      </div>
      {enrolled ? <Badge tone="green" className="mb-3"><Check size={12} />Enrolled for testing</Badge> : <button className="btn-primary text-xs" disabled={busy || !course?.canEnroll} onClick={() => void enroll()}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : null}Enroll for testing</button>}
    </div>
    <p className="mt-3 text-[10px] leading-5 text-muted">Enrollment is required for every playback request, including administrators. {course && !course.canEnroll && !enrolled ? "This course does not allow self-enrollment; it can be used for the access-denial test." : "Select an enrolled lesson in the test bench below. These containers do not supply official course videos."}</p>
    {error && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
  </section>;
}