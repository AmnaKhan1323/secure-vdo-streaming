"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FlaskConical, Menu, Settings2, ShieldCheck, X } from "lucide-react";
import { Brand } from "./brand";
import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  const mainLinks = [{ href: "/dashboard", name: "Video comparison", icon: FlaskConical }];
  return <>
    <button onClick={() => setOpen(true)} className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface lg:hidden" aria-label="Open navigation" aria-expanded={open} aria-controls="workspace-navigation"><Menu size={18} /></button>
    {open && <button className="fixed inset-0 z-40 bg-black/70 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside id="workspace-navigation" className={cn("fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-border bg-[#10121b] p-5 lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
      <div className="mb-12 mt-2 flex items-center justify-between"><Brand /><button onClick={() => setOpen(false)} className="p-2 lg:hidden" aria-label="Close navigation"><X size={18} /></button></div>
      <nav aria-label="Main navigation" className="space-y-1.5"><p className="eyebrow mb-4 px-3 text-[9px]">Streaming prototype</p>{mainLinks.map(({ href, name, icon: Icon }) => { const active = path === href || (href === "/dashboard" && path === "/comparison") || (href === "/courses" && path.startsWith("/courses/")); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors", active ? "border border-violet-400/10 bg-[#262039] text-[#baa8ff]" : "border border-transparent text-muted hover:bg-surface-raised hover:text-white")}><Icon size={17} strokeWidth={1.7} />{name}</Link>; })}
        {isAdmin && <><p className="eyebrow mb-3 mt-8 px-3 text-[9px]">Administration</p><Link href="/admin" onClick={() => setOpen(false)} aria-current={path === "/admin" ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-3 py-3 text-[13px]", path === "/admin" ? "bg-[#262039] text-violet-300" : "text-muted hover:bg-surface-raised")}><Settings2 size={17} />Provider setup</Link></>}
      </nav>
      <div className="mt-auto"><div className="rounded-xl border border-[#39324f] bg-[#191a27] p-4"><ShieldCheck size={17} className="mb-3 text-violet-300" /><h2 className="text-xs font-semibold">Same video. Two providers.</h2><p className="mt-2 text-[11px] leading-relaxed text-muted">Test authenticated playback, short-lived tokens, and provider protection before integrating with {SITE.domain}.</p></div><div className="mt-5 flex items-center justify-between px-2 text-[9px] text-[#69718a]"><span>{SITE.shortName} STREAMING PROTOTYPE</span><span>v0.1</span></div></div>
    </aside>
  </>;
}