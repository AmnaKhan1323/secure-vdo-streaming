import { providerSchema, providerSettingSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { requireAdminIdentity, revalidateIdentity } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { assertSameOrigin, handleApiError, json, rateLimit, readJson } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";
import { assertSessionActive, lockIdentity } from "@/lib/server/commit-access";

export const runtime = "nodejs";
export async function PUT(request: Request, context: { params: Promise<{ provider: string }> }) {
  try {
    assertSameOrigin(request);
    const identity = await requireAdminIdentity(request);
    const viewer = identity.viewer;
    await rateLimit(viewer.id, "provider-config", 6);
    const providerResult = providerSchema.safeParse((await context.params).provider);
    if (!providerResult.success) throw new AppError("INVALID_REQUEST", "Unknown video provider.");
    const provider = providerResult.data;
    const input = await readJson(request, providerSettingSchema);
    const report = input.applyRemote ? await providerAdapter(provider).applyProtection(input.allowedDomains, () => revalidateIdentity(request, identity, true)) : null;
    const setting = await db().$transaction(async (transaction) => {
      const sessionExpiresAt = await lockIdentity(transaction, identity, true);
      const updated = await transaction.providerSetting.upsert({ where: { provider }, create: { provider, enabled: input.enabled, ttlSeconds: input.ttlSeconds, allowedDomains: input.allowedDomains }, update: { enabled: input.enabled, ttlSeconds: input.ttlSeconds, allowedDomains: input.allowedDomains } });
      assertSessionActive(sessionExpiresAt);
      return updated;
    });
    return json({ setting: { provider: setting.provider, enabled: setting.enabled, ttlSeconds: setting.ttlSeconds, allowedDomains: setting.allowedDomains }, report });
  } catch (error) { return handleApiError(error); }
}