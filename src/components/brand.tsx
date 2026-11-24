import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SITE } from "@/lib/site";

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/dashboard" className="inline-flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#ac98ff40] bg-gradient-to-br from-[#9d83f1] to-[#6652bd] text-white shadow-[0_4px_20px_#8d75ee15]">
        <ShieldCheck size={20} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block max-w-[145px] text-sm font-bold leading-5 tracking-tight text-[#d3c7ff]">{SITE.name}</span>
        {!small && <span className="mt-0.5 block text-[8px] font-medium uppercase tracking-[0.12em] text-muted">Streaming test prototype</span>}
      </span>
    </Link>
  );
}