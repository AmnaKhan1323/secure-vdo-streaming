"use client";

import Link from "next/link";
import { Database, RotateCcw } from "lucide-react";
import { EmptyState } from "@/components/ui";

export default function WorkspaceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <EmptyState title="The workspace couldn't load" description="Check that PostgreSQL is running and the database migration has been applied. No fallback course data or provider streams are substituted." icon={<Database size={22} />} action={<div className="flex flex-wrap justify-center gap-3"><button className="btn-primary" onClick={reset}><RotateCcw size={14} />Try again</button><Link href="/setup" className="btn-secondary">Setup requirements</Link></div>} />;
}