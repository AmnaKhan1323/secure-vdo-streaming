import "server-only";
import type { Viewer } from "@/lib/types";
import { db } from "./db";

export async function getTestCourses(viewer: Viewer) {
  return db().course.findMany({
    where: viewer.role === "ADMIN" ? {} : { published: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, title: true, published: true, openEnrollment: true,
      enrollments: { where: { userId: viewer.id }, select: { id: true } },
      lessons: { orderBy: { position: "asc" }, select: { id: true, title: true, videos: { select: { provider: true } } } },
    },
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

