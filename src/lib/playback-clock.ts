export function conservativeTokenLifetime(expiresAt: string, serverNow: string, requestMs: number) {
  // Subtract the entire request round trip: conservative even though signing
  // happens near the end of the request. Never extend a server token on transit.
  return Math.max(0, Date.parse(expiresAt) - Date.parse(serverNow) - Math.max(0, requestMs));
}