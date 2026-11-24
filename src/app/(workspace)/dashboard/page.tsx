import type { Metadata } from "next";
import { StreamingTestWorkspace } from "@/components/streaming-test-workspace";

export const metadata: Metadata = { title: "Secure streaming test" };

export default function DashboardPage() {
  return <StreamingTestWorkspace />;
}