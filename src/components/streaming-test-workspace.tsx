import Link from "next/link";
import { ArrowRight, Settings2, ShieldCheck } from "lucide-react";
import { requirePageViewer } from "@/lib/server/authorization";
import { getAttempts, getTestCourses } from "@/lib/server/queries";
import { providerSettings } from "@/lib/server/providers";
import { comparisonLessons } from "@/lib/comparison-lessons";
import { SITE } from "@/lib/site";
import { formatMilliseconds } from "@/lib/utils";
import { ComparisonLab } from "./comparison-lab";
import { Badge, Notice, PageHeading, ProviderBadge } from "./ui";
import { CourseAccess } from "./course-access";

export async function StreamingTestWorkspace() {
  const viewer = await requirePageViewer();
  const [courses, attempts, settings] = await Promise.all([
    getTestCourses(viewer), getAttempts(viewer), providerSettings(),
  ]);
  const lessons = comparisonLessons(courses);
  const nonEnrolledLessonId = courses.find((course) => course.published && !course.enrollments.length && course.lessons.length)?.lessons[0]?.id;

  return <>
    <PageHeading
      eyebrow={`${SITE.name} · ${SITE.targetName}`}
      title="Secure course-video streaming"
      description="A small test bench: compare the same authorized lesson on Gumlet and Bunny Stream."
      action={<Badge tone="violet">PROTOTYPE · NOT THE LIVE WEBSITE</Badge>}
    />

    <div className="mb-5 grid gap-4 md:grid-cols-2">
      {settings.map((setting) => <section key={setting.provider} className="panel p-5" aria-label={`${setting.provider === "GUMLET" ? "Gumlet" : "Bunny Stream"} setup status`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ProviderBadge provider={setting.provider} />
          <Badge tone={setting.configured && setting.enabled ? "blue" : "amber"}>
            {setting.configurationState === "updating" ? "Configuration updating" : setting.configurationState === "failed" ? "Update failed · retry setup" : !setting.configured ? "Credentials required" : !setting.enabled ? "Enable in provider setup" : "Configured · playback unverified"}
          </Badge>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted">
          {setting.configured
            ? `Configured token TTL: ${setting.ttlSeconds}s. Asset readiness, domain restrictions, and effective protection are checked on every playback request.`
            : "Set the real provider credentials privately on the server. No public test stream is substituted."}
        </p>
        {setting.missing.length > 0 && <p className="mt-2 break-words text-[10px] leading-5 text-violet-200">Required server variables: {setting.missing.join(", ")}</p>}
      </section>)}
    </div>

    <div className="panel mb-5 flex flex-wrap items-center justify-between gap-4 p-4">
      <p className="max-w-2xl text-xs leading-6 text-muted">
        <span className="font-medium text-slate-200">Test workflow:</span>{" "}
        enroll in a test course → link the same source video on both providers → run playback, expiry, and access tests.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link href={viewer.role === "ADMIN" ? "/admin" : "/setup"} className="btn-secondary text-xs">
          <Settings2 size={13} />{viewer.role === "ADMIN" ? "Provider setup" : "Setup requirements"}
        </Link>
      </div>
    </div>

    <CourseAccess courses={courses.map((course) => ({ id: course.id, title: course.title, enrolled: course.enrollments.length > 0, canEnroll: course.published && course.openEnrollment }))} />
    <ComparisonLab key={lessons.map((lesson) => lesson.id).join(":")} lessons={lessons} isAdmin={viewer.role === "ADMIN"} nonEnrolledLessonId={nonEnrolledLessonId} settings={settings} />

    <details className="panel mt-6 overflow-hidden">
      <summary className="flex flex-wrap items-center justify-between gap-3 p-5">
        <span><span className="block text-sm font-semibold">Saved test runs</span><span className="mt-1 block text-[10px] text-muted">Your latest {attempts.length} observations. Refresh after a run to reload saved results.</span></span>
        <ArrowRight size={14} className="text-violet-300" />
      </summary>
      {attempts.length > 0 ? <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[690px] text-left text-xs">
          <thead className="bg-white/[0.02] text-[10px] text-muted"><tr>{["Provider / lesson", "Scenario", "API server", "Player ready", "Playback observed", "Outcome"].map((label) => <th key={label} className="px-5 py-3 font-medium">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">{attempts.map((attempt) => <tr key={attempt.id}>
            <td className="px-5 py-4"><ProviderBadge provider={attempt.provider} /><p className="mt-2 max-w-56 text-[10px] leading-4 text-muted">{attempt.lesson.title}</p></td>
            <td className="px-5 py-4 text-muted">{attempt.mode}</td>
            <td className="px-5 py-4 tabular-nums">{formatMilliseconds(attempt.issuanceMs)}</td>
            <td className="px-5 py-4 tabular-nums">{formatMilliseconds(attempt.readyMs)}</td>
            <td className="px-5 py-4 tabular-nums">{formatMilliseconds(attempt.firstFrameMs)}</td>
            <td className="px-5 py-4"><Badge tone={attempt.firstFrameMs !== null ? "green" : "neutral"}>{attempt.outcome}</Badge>{attempt.outcome === "expired" && <p className="mt-1 text-[9px] text-muted">Application deadline</p>}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="border-t border-border px-5 py-5 text-xs text-muted">No saved observations. Real playback measurements appear here after a configured run.</p>}
    </details>

    <div className="mt-6"><Notice>
      <p className="flex items-center gap-2 font-medium"><ShieldCheck size={14} />Prototype boundary</p>
      <p className="mt-2">This app is for testing course-video delivery for the {SITE.targetName}; it does not connect to the existing website accounts, paid entitlements, or official course catalog. Use authorized videos. Sample lesson text is only a test container.</p>
      <p className="mt-2">A player load, countdown, or HTTP 200 is not proof of protected playback. Actual expiry, referrer, and media/CDN enforcement require configured provider accounts and browser verification.</p>
    </Notice></div>
  </>;
}