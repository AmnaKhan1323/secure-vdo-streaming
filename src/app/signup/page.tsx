import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth-frame";
import { AuthForm } from "@/components/auth-form";
import { authConfigured } from "@/lib/server/env";

export const metadata: Metadata = { title: "Create an account" };
export const dynamic = "force-dynamic";
export default function SignupPage() { return <AuthFrame><AuthForm mode="signup" configured={authConfigured()} /></AuthFrame>; }