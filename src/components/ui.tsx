import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PROVIDER_META, type VideoProvider } from "@/lib/types";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "violet" | "blue" | "green" | "amber"; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium", { "border-border bg-white/[0.03] text-muted": tone === "neutral", "border-violet-400/15 bg-violet-400/10 text-violet-300": tone === "violet", "border-blue-400/15 bg-blue-400/10 text-blue-300": tone === "blue", "border-emerald-400/15 bg-emerald-400/10 text-emerald-300": tone === "green", "border-amber-400/15 bg-amber-400/10 text-amber-200": tone === "amber" }, className)}>{children}</span>;
}

export function ProviderBadge({ provider }: { provider: VideoProvider }) {
  return <Badge tone={provider === "GUMLET" ? "violet" : "blue"}><span className="h-1 w-1 rounded-full bg-current" />{PROVIDER_META[provider].name}</Badge>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h1><p className="mt-2 text-sm leading-relaxed text-muted">{description}</p></div>{action}</div>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress" className={cn("h-1.5 overflow-hidden rounded-full bg-[#282c3c]", className)}><div className="h-full rounded-full bg-gradient-to-r from-[#8d75ee] to-[#afa0f8]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  return <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border p-3.5 text-xs leading-relaxed", tone === "error" ? "border-rose-500/20 bg-rose-500/5 text-rose-200" : tone === "success" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-blue-400/15 bg-blue-400/5 text-slate-300")}>{children}</div>;
}

export function EmptyState({ title, description, icon, action }: { title: string; description: string; icon?: ReactNode; action?: ReactNode }) {
  return <div className="panel flex flex-col items-center px-6 py-12 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-raised text-primary">{icon}</div><h2 className="text-base font-semibold">{title}</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}