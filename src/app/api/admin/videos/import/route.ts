import { importVideoSchema } from "@/lib/validation";
import { requireAdminIdentity, revalidateIdentity } from "@/lib/server/authorization";
import { apiRoute, assertSameOrigin, json, rateLimit, readJson } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";
import { validateImportUrl } from "@/lib/server/providers/source-url";

export const runtime = "nodejs";
export const POST = apiRoute(async (request) => {
  assertSameOrigin(request);
  const identity = await requireAdminIdentity(request);
  const viewer = identity.viewer;
  await rateLimit(viewer.id, "video-import", 3);
  const input = await readJson(request, importVideoSchema);
  const sourceUrl = await validateImportUrl(input.sourceUrl, (process.env.VIDEO_IMPORT_ALLOWED_HOSTS ?? "").split(",").filter(Boolean));
  await revalidateIdentity(request, identity, true);
  const result = await providerAdapter(input.provider).importVideo(input.title, sourceUrl);
  await revalidateIdentity(request, identity, true);
  return json(result, 202);
});