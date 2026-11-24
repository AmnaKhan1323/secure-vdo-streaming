import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requirePageAdmin } from "@/lib/server/authorization";
import { getTestCourses } from "@/lib/server/queries";
import { providerSettings } from "@/lib/server/providers";
import { db } from "@/lib/server/db";
import { PageHeading, Notice } from "@/components/ui";
import { AdminProviderCard } from "@/components/admin-provider-card";
import { VideoMappingForm } from "@/components/video-mapping-form";

export const metadata: Metadata = { title: "Provider setup" };

export default async function AdminPage() {
  const viewer = await requirePageAdmin();
  const [courses, settings, mappings] = await Promise.all([
    getTestCourses(viewer),
    providerSettings(),
    db().lessonVideo.findMany({ select: { lessonId: true, provider: true, assetId: true } }),
  ]);
  const lessons = courses.flatMap((course) => course.lessons.map((lesson) => ({
    id: lesson.id,
    title: lesson.title,
    courseTitle: course.title,
    mappings: mappings.filter((mapping) => mapping.lessonId === lesson.id).map(({ provider, assetId }) => ({ provider, assetId })),
  })));

  return <>
    <PageHeading title="Provider setup" description="Configure Gumlet and Bunny Stream, then link the same authorized video to a test lesson." action={<Link href="/dashboard" className="btn-secondary text-xs">Back to comparison <ArrowRight size={13} /></Link>} />
    <div className="mb-5"><Notice>Private API/signing keys belong in server environment variables, not these forms. Provider changes affect the real workspace/library and require explicit confirmation. Upload files in the provider consoles.</Notice></div>
    <div className="mb-5 grid gap-5 xl:grid-cols-2">{settings.map((setting) => <AdminProviderCard key={setting.provider} settings={setting} />)}</div>
    <VideoMappingForm lessons={lessons} />
  </>;
}