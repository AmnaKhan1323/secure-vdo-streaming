"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function signOut() {
    setBusy(true);
    setError(false);
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.push("/login"); router.refresh(); }
    catch { setError(true); setBusy(false); }
  }
  return <div><button disabled={busy} onClick={signOut} className="rounded-lg p-2 text-muted hover:bg-surface-raised hover:text-white disabled:opacity-40" aria-label={busy ? "Signing out" : "Sign out"} title="Sign out"><LogOut size={16} /></button>{error && <p role="alert" className="text-[10px] text-rose-300">Try again</p>}</div>;
}