import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import type { Viewer } from "@/lib/types";
import { getAuth } from "./auth";
import { authConfigured } from "./env";
import { db } from "./db";
import type { AuthIdentity } from "./access-types";

async function getIdentity(requestHeaders: Headers): Promise<AuthIdentity | null> {
  const session = await getAuth().api.getSession({ headers: requestHeaders, query: { disableCookieCache: true } });
  if (!session) return null;
  // A fresh row prevents a stale cookie/session payload from retaining admin privileges.
  const user = await db().user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, role: true } });
  if (!user) return null;
  return { viewer: { ...user, role: user.role === "ADMIN" ? "ADMIN" : "STUDENT" }, sessionId: session.session.id };
}

export async function getViewer(requestHeaders: Headers): Promise<Viewer | null> {
  return (await getIdentity(requestHeaders))?.viewer ?? null;
}

export async function requireIdentity(request: Request): Promise<AuthIdentity> {
  const identity = await getIdentity(request.headers);
  if (!identity) throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return identity;
}

export async function requireAdminIdentity(request: Request): Promise<AuthIdentity> {
  const identity = await requireIdentity(request);
  if (identity.viewer.role !== "ADMIN") throw new AppError("FORBIDDEN", "Administrator access is required.", 403);
  return identity;
}

export async function revalidateIdentity(request: Request, identity: AuthIdentity, admin = false) {
  const current = admin ? await requireAdminIdentity(request) : await requireIdentity(request);
  if (current.viewer.id !== identity.viewer.id || current.sessionId !== identity.sessionId || current.viewer.role !== identity.viewer.role) {
    throw new AppError("AUTHORIZATION_CHANGED", "Session or account permissions changed during the operation.", 403);
  }
}

export async function requireViewer(request: Request) {
  return (await requireIdentity(request)).viewer;
}

export async function requireAdmin(request: Request) {
  const viewer = await requireViewer(request);
  if (viewer.role !== "ADMIN") throw new AppError("FORBIDDEN", "Administrator access is required.", 403);
  return viewer;
}

export async function requirePageViewer() {
  if (!authConfigured()) redirect("/setup");
  const viewer = await getViewer(await headers());
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requirePageAdmin() {
  const viewer = await requirePageViewer();
  if (viewer.role !== "ADMIN") redirect("/dashboard");
  return viewer;
}

export async function requireLessonAccess(viewer: Viewer, lessonId: string) {
  const lesson = await db().lesson.findUnique({ where: { id: lessonId }, include: { course: true, videos: true } });
  if (!lesson || (!lesson.course.published && viewer.role !== "ADMIN")) throw new AppError("NOT_FOUND", "Lesson not found.", 404);
  const enrollment = await db().enrollment.findUnique({ where: { userId_courseId: { userId: viewer.id, courseId: lesson.courseId } } });
  // Admins must also enroll: there is no hidden playback authorization bypass.
  if (!enrollment) throw new AppError("NOT_ENROLLED", "Enroll in this course before requesting playback.", 403);
  return lesson;
}