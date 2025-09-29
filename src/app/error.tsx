"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Global error boundary page for the App Router.
 * Shown when an uncaught error bubbles during rendering or a server action.
 * We intentionally include <html><body> because this is at the app root.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  useEffect(() => {
    console.error("[global_error]", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: (error as unknown as { digest?: string })?.digest,
    });
    // TODO: ship to external monitoring (Sentry / Logtail) here.
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";
  const digest = (error as unknown as { digest?: string })?.digest;

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center px-6 py-10">
        <main className="w-full max-w-xl text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              An unexpected error occurred. {digest ? "Reference code: " : null}
              {digest && (
                <code className="font-mono text-xs bg-slate-200/70 px-1.5 py-0.5 rounded">
                  {digest}
                </code>
              )}
              . You can retry the last action or return to the homepage.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Retry
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Home
            </Link>
            <Link
              href="/support" // adjust if a real support/contact route differs
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              Contact support
            </Link>
            {isDev && (
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {showDetails ? "Hide details" : "Show details"}
              </button>
            )}
          </div>
          {isDev && showDetails && (
            <div className="text-left rounded-lg border border-slate-300 bg-white p-4 text-xs font-mono leading-relaxed overflow-auto max-h-80">
              <p className="mb-2 font-semibold">Error details (dev only)</p>
              <pre className="whitespace-pre-wrap break-words">
                {error.name}: {error.message}
                {"\n"}
                {error.stack}
              </pre>
            </div>
          )}
        </main>
        <footer className="mt-10 text-center text-[11px] text-slate-400">
          &copy; {new Date().getFullYear()} FishOn. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
