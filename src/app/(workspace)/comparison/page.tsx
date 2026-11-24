import type { Metadata } from "next";
import { StreamingTestWorkspace } from "@/components/streaming-test-workspace";

export const metadata: Metadata = { title: "Secure streaming comparison" };

export default function ComparisonPage() {
  return <StreamingTestWorkspace />;
}