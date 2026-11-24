import { AppError } from "@/lib/errors";
import { enrollmentSchema } from "@/lib/validation";
import { requireViewer } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { apiRoute, assertSameOrigin, json, rateLimit, readJson } from "@/lib/server/http";

export const runtime = "nodejs";
export const POST = apiRoute(async (request) => {
  assertSameOrigin(request);
  const viewer = await requireViewer(request);
  await rateLimit(viewer.id, "enroll", 10);
  const { courseId } = await readJson(request, enrollmentSchema);
  const course = await db().course.findUnique({ where: { id: courseId } });
  if (!course?.published) throw new AppError("NOT_FOUND", "Course not found.", 404);
  if (!course.openEnrollment) throw new AppError("ENROLLMENT_CLOSED", "An administrator must enroll you in this course.", 403);
  await db().enrollment.upsert({ where: { userId_courseId: { userId: viewer.id, courseId } }, create: { userId: viewer.id, courseId }, update: {} });
  return json({ enrolled: true });
});