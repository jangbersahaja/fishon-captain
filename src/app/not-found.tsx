import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="space-y-4 max-w-xl">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-800">
          404
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          The page you were looking for either doesn&apos;t exist, was moved, or
          is temporarily unavailable.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Go home
          </Link>
          <Link
            href="/captain"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Captain portal
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Contact support
          </Link>
        </div>
      </div>
      <footer className="mt-10 text-center text-[11px] text-slate-400">
        &copy; {new Date().getFullYear()} FishOn. All rights reserved.
      </footer>
    </div>
  );
}
