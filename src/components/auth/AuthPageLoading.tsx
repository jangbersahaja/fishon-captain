/**
 * Reusable loading fallback for auth pages
 * Used as Suspense fallback while useSearchParams hydrates
 */

export function AuthPageLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-xl px-4 py-16 sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-[#ec2227]/20 bg-white shadow-xl">
          <div className="border-b border-[#ec2227]/15 bg-[#ec2227]/5 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ec2227]">
              Fishon captain portal
            </p>
          </div>
          <div className="px-6 py-8 sm:px-8">
            <div className="text-center text-slate-600">Loading...</div>
          </div>
        </div>
      </div>
    </main>
  );
}
