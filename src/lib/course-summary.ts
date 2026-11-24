import type { CourseWithProgress } from "@/lib/server/queries";
import type { CourseSummary } from "@/components/course-card";

export function toCourseSummary(course: CourseWithProgress): CourseSummary {
  const completed = course.lessons.filter((lesson) => lesson.progress[0]?.completed).length;
  return { id: course.id, slug: course.slug, title: course.title, subtitle: course.subtitle, category: course.category, level: course.level, accent: course.accent, instructor: course.instructor, lessonCount: course.lessons.length, durationSeconds: course.lessons.reduce((total, lesson) => total + lesson.estimatedSeconds, 0), enrolled: course.enrollments.length > 0, progress: course.lessons.length ? Math.round(completed / course.lessons.length * 100) : 0, providers: [...new Set(course.lessons.flatMap((lesson) => lesson.videos.map((video) => video.provider)))] };
}