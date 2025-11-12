import authOptions from "@/lib/auth";
import { getRevenueStats } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MetricCard } from "../_components/MetricCard";

export const dynamic = "force-dynamic";

export default async function StaffFinancePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/finance");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Fetch revenue stats
  const stats30d = await getRevenueStats("30d");
  const stats7d = await getRevenueStats("7d");

  // Calculate change percentage
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform revenue, commissions, and payout tracking
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Revenue (30d)"
          value={`RM ${stats30d.totalRevenue.toLocaleString()}`}
          change={calculateChange(stats30d.totalRevenue, stats7d.totalRevenue)}
          icon="💰"
        />

        <MetricCard
          title="Platform Commission"
          value={`RM ${stats30d.platformRevenue.toLocaleString()}`}
          subtitle={`${stats30d.totalRevenue > 0 ? ((stats30d.platformRevenue / stats30d.totalRevenue) * 100).toFixed(1) : 0}% avg rate`}
          icon="📊"
        />

        <MetricCard
          title="Pending Payouts"
          value={`RM ${stats30d.pendingPayouts.toLocaleString()}`}
          subtitle="Awaiting processing"
          icon="⏳"
          alert={stats30d.pendingPayouts > 10000}
        />

        <MetricCard
          title="Bookings (30d)"
          value={stats30d.bookingCount.toString()}
          subtitle={`RM ${stats30d.avgBookingValue.toFixed(0)} avg`}
          icon="📅"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/staff/finance/bookings"
          className="p-4 transition border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <h3 className="font-semibold text-slate-900">All Bookings</h3>
          <p className="mt-1 text-sm text-slate-600">
            View and filter all platform bookings
          </p>
        </Link>

        <Link
          href="/staff/finance/payouts"
          className="p-4 transition border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <h3 className="font-semibold text-slate-900">Payout Queue</h3>
          <p className="mt-1 text-sm text-slate-600">
            Process captain earnings and manage payouts
          </p>
        </Link>

        <Link
          href="/staff/finance/reports"
          className="p-4 transition border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <h3 className="font-semibold text-slate-900">Reports</h3>
          <p className="mt-1 text-sm text-slate-600">
            Export financial data (Coming Soon)
          </p>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="p-6 border border-slate-200 rounded-lg bg-white">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          30-Day Summary
        </h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <dt className="text-sm text-slate-600">Total Revenue</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">
              RM {stats30d.totalRevenue.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Captain Earnings</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">
              RM {stats30d.captainRevenue.toLocaleString()}
            </dd>
            <dd className="mt-1 text-xs text-slate-500">
              {stats30d.totalRevenue > 0
                ? `${((stats30d.captainRevenue / stats30d.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}{" "}
              of revenue
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-600">Platform Commission</dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-900">
              RM {stats30d.platformRevenue.toLocaleString()}
            </dd>
            <dd className="mt-1 text-xs text-slate-500">
              {stats30d.totalRevenue > 0
                ? `${((stats30d.platformRevenue / stats30d.totalRevenue) * 100).toFixed(1)}%`
                : "0%"}{" "}
              of revenue
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
