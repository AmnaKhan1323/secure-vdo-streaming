import { z } from "zod";
import { AppError } from "@/lib/errors";

export type Fetcher = typeof fetch;

/** Fixed upstream origins; no user-supplied API URLs or credential-bearing redirects. */
export async function providerRequest<T>(fetcher: Fetcher, provider: string, url: string, keyHeader: string, key: string, schema: z.ZodType<T>, body?: unknown, allowEmpty = false) {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: body === undefined ? "GET" : "POST",
      headers: { [keyHeader]: key, Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError("PROVIDER_UNREACHABLE", `${provider} could not be reached. Check connectivity and provider configuration.`, 502);
  }
  if (!response.ok) {
    // Provider bodies can contain source URLs or secrets. Never reflect or log them.
    await response.body?.cancel();
    throw new AppError("PROVIDER_API_ERROR", `${provider} API returned HTTP ${response.status}. Check credentials, permissions, quota, and asset IDs.`, 502);
  }
  let data: unknown;
  try {
    const text = await response.text();
    data = allowEmpty && !text.trim() ? {} : JSON.parse(text);
  } catch { throw new AppError("PROVIDER_RESPONSE_INVALID", `${provider} returned invalid JSON.`, 502); }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AppError("PROVIDER_RESPONSE_INVALID", `${provider} returned an unexpected API response. Verify the current official API schema.`, 502);
  return parsed.data;
}