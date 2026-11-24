import { redirect } from "next/navigation";
import { authConfigured } from "@/lib/server/env";

export const dynamic = "force-dynamic";
export default function Home() { redirect(authConfigured() ? "/dashboard" : "/setup"); }