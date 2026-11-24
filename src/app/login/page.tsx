import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { AuthForm } from "@/components/auth-form";
import { authConfigured } from "@/lib/server/env";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default function LoginPage() { return <AuthFrame><AuthForm mode="login" configured={authConfigured()} /></AuthFrame>; }