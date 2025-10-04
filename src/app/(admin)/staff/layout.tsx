import { zIndexClasses } from "@/config/zIndex";
import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import StaffNav from "./_components/StaffNav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const h = await headers();
  const path = h.get("x-invoke-path") || ""; // not always present; fallback to simple breadcrumbs
  // Basic breadcrumbs based on URL segments
  const segments = (path || "/staff").split("/").filter(Boolean);

  return (
    <div className="min-h-screen">
      <header
        className={`sticky top-0 ${zIndexClasses.subNavigation} border-b border-slate-200 bg-white/80 backdrop-blur`}
      >
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/staff"
              className="text-lg font-semibold text-slate-900"
            >
              Staff
            </Link>
            <StaffNav />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl">
        <div className="px-6 pt-4 text-xs text-slate-500">
          <nav className="flex items-center gap-1">
            <Link href="/staff" className="hover:underline">
              Staff
            </Link>
            {segments.slice(1).map((seg, i) => {
              const href = "/" + segments.slice(0, i + 2).join("/");
              return (
                <span key={href} className="flex items-center gap-1">
                  <span>/</span>
                  <Link href={href} className="hover:underline">
                    {seg}
                  </Link>
                </span>
              );
            })}
          </nav>
        </div>
        <main>{children}</main>
      </div>
    </div>
  );
}
