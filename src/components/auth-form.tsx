"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, LoaderCircle, LockKeyhole } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Notice } from "./ui";
import { SITE } from "@/lib/site";

export function AuthForm({ mode, configured }: { mode: "login" | "signup"; configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    try {
      const result = mode === "signup" ? await authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password }) : await authClient.signIn.email({ email, password });
      if (result.error) { setError(result.error.status === 429 ? "Too many attempts. Wait a little before trying again." : mode === "login" ? "Sign-in failed. Check your email and password, or try again shortly." : result.error.status === 422 ? "An account with these details may already exist. Try signing in." : "Account creation failed. Use a valid email and a password of 12–128 characters, then try again."); return; }
      router.push("/dashboard");
      router.refresh();
    } catch { setError("Authentication is unavailable. Check the database and server configuration."); }
    finally { setBusy(false); }
  }
  return <div><div className="mb-7"><span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/10 text-violet-300"><LockKeyhole size={20} /></span><h1 className="text-3xl font-semibold tracking-tight">{mode === "login" ? "Sign in to test playback." : "Create a prototype account."}</h1><p className="mt-3 text-sm leading-relaxed text-muted">Test secure course-video streaming with Gumlet and Bunny Stream. This app has its own test accounts; it does not connect to an existing course website automatically.</p></div>{!configured && <div className="mb-5"><Notice>Authentication needs a PostgreSQL database and a private session secret. <Link href="/setup" className="underline underline-offset-4">View setup requirements</Link>.</Notice></div>}
    <form onSubmit={submit} className="space-y-5">
      {mode === "signup" && <label className="block text-xs font-medium text-slate-300">Full name<input className="input mt-2" name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="How should we address you?" /></label>}
      <label className="block text-xs font-medium text-slate-300">Email address<input className="input mt-2" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" /></label>
      <label className="block text-xs font-medium text-slate-300">Password<input className="input mt-2" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} placeholder={mode === "signup" ? "At least 12 characters" : "Enter your password"} /></label>
      {error && <Notice tone="error">{error}</Notice>}
      <button className="btn-primary w-full" disabled={busy || !configured}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <>{mode === "login" ? "Sign in to your workspace" : "Create your account"}<ArrowRight size={16} /></>}</button>
    </form><p className="mt-6 text-center text-xs text-muted">{mode === "login" ? `New to the ${SITE.name} prototype?` : "Already have a prototype account?"} <Link className="ml-1 text-violet-300 hover:text-white" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p><p className="mt-8 text-center text-[10px] leading-relaxed text-[#798298]">Streaming prototype · Separate from existing website accounts.<br />No shared demo passwords. All accounts start as students.</p>
  </div>;
}