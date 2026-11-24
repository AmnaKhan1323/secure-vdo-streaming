import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import type { Viewer } from "@/lib/types";
import { initials } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { SignOutButton } from "./user-menu";
import { SITE } from "@/lib/site";

export function AppShell({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar isAdmin={viewer.role === "ADMIN"} />
      <div className="lg:ml-[236px]">
        <header className="flex h-[72px] items-center justify-between gap-5 border-b border-border px-5 pl-16 sm:px-8 lg:pl-8">
          <p className="hidden text-xs text-muted sm:block">
            Secure video test{" "}
            <span className="mx-2 text-[#42495e]">/</span>
            <span className="text-slate-200">{SITE.name}</span>
          </p>
          <div className="ml-auto flex items-center gap-3">
            <span
              title="Playback requires authentication and enrollment"
              className="hidden text-[#82baa6] xl:block"
            >
              <ShieldCheck size={17} />
            </span>
            <div className="h-7 w-px bg-border" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#635782] bg-[#30263f] text-[10px] font-semibold text-[#d4c6ff]">
              {initials(viewer.name)}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium">{viewer.name}</p>
              <p className="mt-0.5 text-[9px] text-muted">
                {viewer.role === "ADMIN" ? "Test administrator" : "Prototype viewer"}
              </p>
            </div>
            <SignOutButton />
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1520px] px-5 py-7 sm:px-8 sm:py-8"
        >
          {children}
        </main>
        <footer className="mx-5 mt-5 flex flex-wrap justify-between gap-2 border-t border-border py-5 text-[10px] text-[#737c93] sm:mx-8">
          <span>
            {SITE.name} · {SITE.prototypeLabel}
          </span>
          <span>Built for {SITE.domain} · Gumlet + Bunny Stream</span>
        </footer>
      </div>
    </div>
  );
}