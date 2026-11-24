import { providerSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/lib/server/authorization";
import { assertSameOrigin, handleApiError, json, rateLimit } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    assertSameOrigin(request);
    const viewer = await requireAdmin(request);
    await rateLimit(viewer.id, "verify", 8);
    const result = providerSchema.safeParse((await context.params).provider);
    if (!result.success) throw new AppError("INVALID_REQUEST", "Unknown video provider.");
    const report = await providerAdapter(result.data).getProtection();
    return json({ report });
  } catch (error) { return handleApiError(error); }
}