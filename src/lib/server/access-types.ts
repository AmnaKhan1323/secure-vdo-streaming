import type { Viewer } from "@/lib/types";

/** Server-side identity binding. Session ID is a row identifier, never a token.
 * Do not pass this structure to client components or serialize it in an API.
 */
export type AuthIdentity = { viewer: Viewer; sessionId: string };