import { z } from "zod";
import { AppError } from "@/lib/errors";
import { providerSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/server/authorization";
import { apiRoute, json, rateLimit } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = apiRoute(async (request) => {
  const viewer = await requireAdmin(request);
  await rateLimit(viewer.id, "catalog", 20);
  const search = new URL(request.url).searchParams;
  const provider = providerSchema.safeParse(search.get("provider"));
  const page = z.coerce.number().int().min(1).max(1000).safeParse(search.get("page") ?? "1");
  if (!provider.success || !page.success) throw new AppError("INVALID_REQUEST", "Select a provider and valid catalog page.");
  return json(await providerAdapter(provider.data).listAssets(page.data));
});