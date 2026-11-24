import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";
import { apiRoute } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute((request) => toNextJsHandler(getAuth()).GET(request));
export const POST = apiRoute((request) => toNextJsHandler(getAuth()).POST(request));