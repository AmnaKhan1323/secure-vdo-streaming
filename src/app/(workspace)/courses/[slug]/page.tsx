import { redirect } from "next/navigation";
import { requirePageViewer } from "@/lib/server/authorization";

export default async function CoursePage() {
  await requirePageViewer();
  redirect("/dashboard");
}