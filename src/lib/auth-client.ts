"use client";

import { createAuthClient } from "better-auth/react";

// Same-origin client. No API key, signing key, or server environment is imported.
export const authClient = createAuthClient();