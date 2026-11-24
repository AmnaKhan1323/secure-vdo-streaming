import { providerSchema, providerSettingSchema } from "@/lib/validation";
import { AppError } from "@/lib/errors";
import { requireAdminIdentity, revalidateIdentity } from "@/lib/server/authorization";
import { db } from "@/lib/server/db";
import { assertSameOrigin, handleApiError, json, rateLimit, readJson } from "@/lib/server/http";
import { providerAdapter } from "@/lib/server/providers";
import { beginProviderOperation, assertProviderOperation, finishProviderOperation, failProviderOperation } from "@/lib/server/provider-configuration";
import { assertProviderPolicy } from "@/lib/server/providers/policy";
import { appOrigin } from "@/lib/server/env";

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
    const operation = await beginProviderOperation(db(), identity, provider, input.expectedRevision);
    try {
      const authorize = async () => { await revalidateIdentity(request, identity, true); await assertProviderOperation(db(), provider, operation); };
      const report = input.applyRemote
        ? await providerAdapter(provider).applyProtection(input.allowedDomains, authorize)
        : operation.requiresVerification && input.enabled ? await providerAdapter(provider).getProtection() : null;
      if (report && input.enabled) assertProviderPolicy(report, new URL(appOrigin()).hostname, input.allowedDomains);
      const setting = await finishProviderOperation(db(), identity, provider, operation, { enabled: input.enabled, ttlSeconds: input.ttlSeconds, allowedDomains: input.allowedDomains });
      return json({ setting: { provider: setting.provider, enabled: setting.enabled, ttlSeconds: setting.ttlSeconds, allowedDomains: setting.allowedDomains, revision: setting.revision, configurationState: setting.configurationState }, report });
    } catch (error) {
      // If cleanup fails or the process crashes, "updating" remains fail-closed.
      try { await failProviderOperation(db(), provider, operation); } catch { console.error("[streamlab] provider operation cleanup failed"); }
      throw error;
    }
  } catch (error) { return handleApiError(error); }
}