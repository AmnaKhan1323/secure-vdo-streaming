import "server-only";
import type { Viewer } from "@/lib/types";
import { db } from "./db";

export async function getCourses(viewer: Viewer) {
  return db().course.findMany({
    where: viewer.role === "ADMIN" ? {} : { published: true },
    orderBy: { createdAt: "asc" },
    include: { enrollments: { where: { userId: viewer.id } }, lessons: { orderBy: { position: "asc" }, include: { videos: { select: { provider: true } }, progress: { where: { userId: viewer.id } } } } },
  });
}

export async function getCourse(viewer: Viewer, slug: string) {
  return db().course.findFirst({
    where: { slug, ...(viewer.role !== "ADMIN" ? { published: true } : {}) },
    include: { enrollments: { where: { userId: viewer.id } }, lessons: { orderBy: { position: "asc" }, include: { videos: { select: { provider: true } }, progress: { where: { userId: viewer.id } } } } },
  });
}

export async function getAttempts(viewer: Viewer) {
  return db().playbackAttempt.findMany({
    where: { userId: viewer.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, provider: true, mode: true, outcome: true, issuanceMs: true, tokenRequestMs: true, iframeLoadMs: true, readyMs: true, firstFrameMs: true, errorCode: true, expiresAt: true, createdAt: true, lesson: { select: { title: true } } },
  });
}

export type CourseWithProgress = Awaited<ReturnType<typeof getCourses>>[number];

export function courseProgress(course: CourseWithProgress) {
  const completed = course.lessons.filter((lesson) => lesson.progress[0]?.completed).length;
  return { completed, total: course.lessons.length, percent: course.lessons.length ? Math.round(completed / course.lessons.length * 100) : 0 };
}