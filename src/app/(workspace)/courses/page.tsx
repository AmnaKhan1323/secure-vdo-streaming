import { redirect } from "next/navigation";
import { requirePageViewer } from "@/lib/server/authorization";

export default async function CoursesPage() {
  await requirePageViewer();
  redirect("/dashboard");
}