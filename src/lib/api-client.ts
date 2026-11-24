"use client";

export class ClientApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) { super(message); }
}

export async function apiClient<T = unknown>(path: string, body?: unknown, options: { method?: "GET" | "POST" | "PUT"; signal?: AbortSignal; keepalive?: boolean } = {}): Promise<T> {
  const response = await fetch(path, { method: options.method ?? (body === undefined ? "GET" : "POST"), headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), credentials: "same-origin", cache: "no-store", signal: options.signal, keepalive: options.keepalive });
  const result = await response.json();
  if (!response.ok) throw new ClientApiError(result.error?.code ?? "REQUEST_FAILED", result.error?.message ?? "Request failed. Try again.", response.status);
  return result as T;
}