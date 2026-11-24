import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <p className="eyebrow mb-4">404 · Not found</p>
      <h1 className="text-3xl font-semibold">
        {"This page isn't in the curriculum."}
      </h1>
      <p className="mt-3 text-sm text-muted">
        The course or lesson may have moved or is not available.
      </p>
      <Link href="/dashboard" className="btn-primary mt-7">
        <ArrowLeft size={15} />
        Back to the workspace
      </Link>
    </main>
  );
}