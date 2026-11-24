import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { requirePageViewer } from "@/lib/server/authorization";
import { getCourses } from "@/lib/server/queries";
import { toCourseSummary } from "@/lib/course-summary";
import { CourseBrowser } from "@/components/course-browser";
import { Badge, PageHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Test courses" };
export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requirePageViewer();
  const courses = await getCourses(viewer);
  const { q } = await searchParams;
  return <><PageHeading eyebrow="Streaming-test containers" title="Choose a test course." description="Enroll to test lesson access. These are original sample containers, not a published course catalog. Existing course data and progress are preserved." action={<Badge tone="violet"><BookOpen size={11} />{courses.length} courses</Badge>} /><CourseBrowser key={typeof q === "string" ? q : ""} courses={courses.map(toCourseSummary)} initialQuery={typeof q === "string" ? q.slice(0, 100) : ""} /></>;
}