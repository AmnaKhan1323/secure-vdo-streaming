import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { appOrigin } from "./env";
import { db } from "./db";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store, max-age=0", "Vary": "Cookie, Origin" } });
}

export function assertSameOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) throw new AppError("INVALID_ORIGIN", "This request must originate from the application.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("INVALID_ORIGIN", "Cross-site requests are not allowed.", 403);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AppError("INVALID_CONTENT_TYPE", "Send an application/json request.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_JSON", "A JSON body is required.", 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16_384) { await reader.cancel(); throw new AppError("BODY_TOO_LARGE", "Request body exceeds 16 KB.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new AppError("INVALID_JSON", "Send valid JSON.", 400); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new AppError("INVALID_REQUEST", result.error.issues[0]?.message ?? "Invalid request.", 400);
  return result.data;
}

export async function rateLimit(userId: string, action: string, max = 30) {
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  const result = await db().apiRateLimit.upsert({
    where: { key: `${userId}:${action}:${minute}` },
    create: { key: `${userId}:${action}:${minute}`, count: 1, expiresAt: new Date((minute + 2) * 60_000) },
    update: { count: { increment: 1 } },
  });
  if (result.count > max) throw new AppError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  await db().apiRateLimit.deleteMany({ where: { expiresAt: { lt: new Date(now) } } });
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) return json({ error: { code: error.code, message: error.message } }, error.status);
  // Never log raw provider bodies, connection URLs, request URLs, or exception messages.
  console.error("[streamlab] request failed:", error instanceof Error ? error.name : "UnknownError");
  return json({ error: { code: "INTERNAL_ERROR", message: "The server could not complete this request. Check database connectivity and server configuration." } }, 500);
}

export function apiRoute(handler: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try { return await handler(request); } catch (error) { return handleApiError(error); }
  };
}