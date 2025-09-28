"use client";
import Link from "next/link";
import { useEffect } from "react";

// Global error boundary page for App Router. Next.js automatically uses this
// when an uncaught error bubbles during a server component render or action.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    // Optionally send to external monitoring here.
    console.error("[global_error]", error);
  }, [error]);
  return (
    <html>
      <body className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-neutral-500 max-w-md">
          An unexpected error occurred. We&#39;ve logged the incident. You can
          try again or return home.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded border border-neutral-300 hover:bg-neutral-50"
          >
            Home
          </Link>
        </div>
      </body>
    </html>
  );
}
