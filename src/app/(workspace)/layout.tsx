import { requirePageViewer } from "@/lib/server/authorization";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePageViewer();
  return <AppShell viewer={viewer}>{children}</AppShell>;
}