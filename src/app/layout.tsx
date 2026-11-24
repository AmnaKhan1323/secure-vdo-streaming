import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE.name} · Secure video streaming test`, template: `%s · ${SITE.name}` },
  description: "A small Next.js prototype for testing secure course-video streaming with both Gumlet and Bunny Stream. Real APIs, enrollment checks, signed playback, and honest measurements.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><a href="#main-content" className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-primary px-4 py-2 text-black focus:not-sr-only">Skip to content</a>{children}</body></html>;
}