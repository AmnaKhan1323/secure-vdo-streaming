import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { requirePageAdmin } from "@/lib/server/authorization";
import { getCourses } from "@/lib/server/queries";
import { providerSettings } from "@/lib/server/providers";
import { Badge, Notice, PageHeading } from "@/components/ui";
import { AdminProviderCard } from "@/components/admin-provider-card";
import { AdminVideoManager } from "@/components/admin-video-manager";
import { ComparisonLab } from "@/components/comparison-lab";
import { DeploymentNote } from "@/components/deployment-note";

export const metadata: Metadata = { title: "Provider administration" };
export default async function AdminPage() {
  const viewer = await requirePageAdmin();
  const [courses, settings] = await Promise.all([getCourses(viewer), providerSettings()]);
  const lessons = courses.flatMap((course) => course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, courseTitle: course.title, mappings: [] as { provider: "GUMLET" | "BUNNY"; assetId: string }[] })));
  // Admin-only query includes asset identifiers; student course responses never do.
  const { db } = await import("@/lib/server/db");
  const mappings = await db().lessonVideo.findMany({ select: { lessonId: true, provider: true, assetId: true } });
  for (const lesson of lessons) lesson.mappings = mappings.filter((mapping) => mapping.lessonId === lesson.id).map(({ provider, assetId }) => ({ provider, assetId }));
  const enrolledLessons = courses.filter((course) => course.enrollments.length).flatMap((course) => course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, courseTitle: course.title, providers: lesson.videos.map((video) => video.provider) })));
  return <><PageHeading eyebrow="Configuration stays server-side" title="A secure foundation for every lesson." description="Connect real providers, configure playback policy, and verify your course videos." action={<Badge tone="violet"><ShieldCheck size={11} />ADMINISTRATOR</Badge>} /><div className="mb-6"><DeploymentNote /></div><div className="mb-6"><Notice>API keys and signing secrets are configured only in server environment variables, never in these forms. Local settings do not automatically secure a provider. Remote changes are explicit and may affect every video in the shared workspace/library.</Notice></div><div className="mb-7 grid gap-5 xl:grid-cols-2">{settings.map((setting) => <AdminProviderCard key={setting.provider} settings={setting} />)}</div><AdminVideoManager lessons={lessons} approvedHosts={(process.env.VIDEO_IMPORT_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean)} /><div className="mb-5 mt-9 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Verify the actual playback</h2><p className="mt-2 text-xs text-muted">Admins must enroll too. Use the same real source on both providers for fair tests.</p></div><Link href="/courses" className="btn-secondary text-xs">Enroll in a test course <ArrowRight size={13} /></Link></div><ComparisonLab lessons={enrolledLessons} isAdmin nonEnrolledLessonId={courses.find((course) => !course.enrollments.length)?.lessons[0]?.id} /></>;
}