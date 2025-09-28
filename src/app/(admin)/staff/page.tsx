import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

//TODO: add more staff features
//TODO: staff can manage captains/charters registrations
//TODO: staff can view reports
//TODO: staff can manage medias
//TODO: add more analytics

export default async function StaffHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Fetch verification queue count (processing only)
  let queueCount = 0;
  try {
    const h = await headers();
    const host = h.get("host");
    const proto = h.get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http")
      ? (host as string)
      : `${proto}://${host}`;
    const url = `${base}/api/admin/verification`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") || "" },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        items?: { processing?: string[] }[];
      };
      const items = Array.isArray(data.items) ? data.items : [];
      queueCount = items.length;
    }
  } catch {}
  // Fetch charters counts
  // Use raw for active/inactive to avoid runtime Prisma Client validation issues if artifacts are stale.
  const totalChartersPromise = prisma.charter.count();
  const activePromise = prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM "Charter" WHERE "isActive" = true
  `;
  const inactivePromise = prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int as count FROM "Charter" WHERE "isActive" = false
  `;
  const [totalCharters, activeRows, inactiveRows] = await Promise.all([
    totalChartersPromise,
    activePromise,
    inactivePromise,
  ]);
  const activeCharters =
    Array.isArray(activeRows) && activeRows[0] ? activeRows[0].count : 0;
  const inactiveCharters =
    Array.isArray(inactiveRows) && inactiveRows[0] ? inactiveRows[0].count : 0;

  return (
    <div className="px-6 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff Dashboard</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Total charters</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {totalCharters}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Active</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {activeCharters}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-sm text-slate-600">Inactive</div>
          <div className="mt-1 text-2xl font-semibold text-slate-700">
            {inactiveCharters}
          </div>
        </div>
      </div>
      <div className="grid gap-3">
        <Link
          href="/staff/verification"
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
        >
          <div>
            <div className="font-medium text-slate-800">Verification queue</div>
            <div className="text-sm text-slate-600">
              Review and approve captain documents
            </div>
          </div>
          <div className="flex items-center gap-2">
            {queueCount > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                {queueCount}
              </span>
            ) : null}
            <span className="text-slate-400 group-hover:text-slate-600">→</span>
          </div>
        </Link>
        <Link
          href="/staff/charters"
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
        >
          <div>
            <div className="font-medium text-slate-800">Charters</div>
            <div className="text-sm text-slate-600">
              Enable/Disable published charters
            </div>
          </div>
          <span className="text-slate-400 group-hover:text-slate-600">→</span>
        </Link>
        <Link
          href="/staff/media"
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
        >
          <div>
            <div className="font-medium text-slate-800">Media pipeline</div>
            <div className="text-sm text-slate-600">
              Monitor pending uploads & resolve stuck items
            </div>
          </div>
          <span className="text-slate-400 group-hover:text-slate-600">→</span>
        </Link>
        <Link
          href="/staff/registrations"
          className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md"
        >
          <div>
            <div className="font-medium text-slate-800">Registrations</div>
            <div className="text-sm text-slate-600">
              Monitor incomplete / submitted drafts
            </div>
          </div>
          <span className="text-slate-400 group-hover:text-slate-600">→</span>
        </Link>
      </div>
    </div>
  );
}
