import { BookOpen, Check, FlaskConical, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";
import { ProviderBadge } from "./ui";
import { SITE } from "@/lib/site";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-[#111321] p-12 lg:flex">
        <Brand />
        <div className="relative mx-auto max-w-md py-12">
          <p className="eyebrow mb-5 text-violet-300">
            Secure course streaming for the {SITE.targetName}
          </p>
          <h2 className="text-5xl font-semibold leading-[1.15] tracking-tight">
            One test lesson.
            <br />
            <span className="text-[#b5a2ff]">Two real providers.</span>
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-muted">
            A small Next.js prototype to compare Gumlet and Bunny Stream for
            your authorized course videos—not a replacement learning platform.
          </p>
          <div className="mt-10 space-y-5">
            {[
              {
                icon: BookOpen,
                title: "The same authorized video",
                text: "Link it to both providers for a useful comparison.",
              },
              {
                icon: ShieldCheck,
                title: "Protected by design",
                text: "Enrollment checks and server-signed video sessions.",
              },
              {
                icon: FlaskConical,
                title: "One lab. Two real providers.",
                text: "Compare the actual Gumlet and Bunny experience.",
              },
            ].map(
              ({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-400/5 text-violet-300">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">{title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {text}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
          <div className="mt-10 flex items-center gap-3 border-t border-border pt-6">
            <ProviderBadge provider="GUMLET" />
            <span className="text-muted">+</span>
            <ProviderBadge provider="BUNNY" />
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted">
          <Check size={13} className="text-violet-300" />
          No simulated streams. No invented performance.
        </p>
      </section>
      <main
        id="main-content"
        className="flex min-h-screen flex-col p-6 sm:p-10"
      >
        <div className="lg:hidden">
          <Brand />
        </div>
        <div className="m-auto w-full max-w-sm py-14">{children}</div>
        <p className="text-center text-[10px] text-[#737c93]">
          {SITE.name} · {SITE.prototypeLabel} for the {SITE.targetName}
        </p>
      </main>
    </div>
  );
}