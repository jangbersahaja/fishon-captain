import { type AnalyticsPeriod } from "@/components/captain/analytics";
import {
  AdminPeriodSelector,
  AllChartersTable,
  EventBreakdownChart,
  PlatformStatsCards,
  PlatformViewsChart,
  TrafficSourcesChart,
} from "@/components/staff/analytics";
import { getPlatformAnalytics } from "@/lib/admin-analytics-service";
import { authOptions } from "@/lib/auth";
import { isMarketDbConfigured } from "@/lib/prisma-market";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{
    period?: string;
  }>;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/staff/analytics");
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    redirect("/captain");
  }

  // Get period from search params (default to 30d)
  const params = await searchParams;
  const period = (params.period as AnalyticsPeriod) || "30d";

  // Validate period
  const validPeriods = ["7d", "30d", "90d", "1y"];
  if (!validPeriods.includes(period)) {
    redirect("/staff/analytics?period=30d");
  }

  return (
    <div className="px-4 py-8 mx-auto space-y-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Platform Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor analytics events across all charters
          </p>
        </div>
        <div className="flex gap-3">
          <AdminPeriodSelector />
        </div>
      </div>

      {/* Analytics Content */}
      <Suspense
        fallback={
          <div className="p-8 text-center bg-white border rounded-2xl border-slate-200">
            <BarChart3 className="w-12 h-12 mx-auto text-slate-400 animate-pulse" />
            <p className="mt-4 text-sm text-slate-600">
              Loading platform analytics...
            </p>
          </div>
        }
      >
        <AnalyticsContent period={period} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({ period }: { period: AnalyticsPeriod }) {
  // Check if market DB is configured
  if (!isMarketDbConfigured()) {
    return (
      <div className="p-8 text-center bg-white border rounded-2xl border-amber-200 bg-amber-50">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Database Not Configured
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          The MARKET_DATABASE_URL environment variable is not set. Analytics
          data requires access to the fishon-market database.
        </p>
      </div>
    );
  }

  try {
    // Fetch platform analytics data
    const data = await getPlatformAnalytics(period);

    // If no data, show empty state
    if (!data || data.summary.totalViews === 0) {
      return (
        <div className="p-8 mt-6 text-center bg-white border rounded-2xl border-slate-200">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No Analytics Data Yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            No analytics events have been recorded for this period. Events will
            appear here once users interact with charters on fishon.my.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <PlatformStatsCards summary={data.summary} />

        {/* Charts Row 1: Views Over Time */}
        <PlatformViewsChart timeSeries={data.timeSeries} />

        {/* Charts Row 2: Traffic Sources and Event Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          <TrafficSourcesChart referralSources={data.referralSources} />
          <EventBreakdownChart eventTypeBreakdown={data.eventTypeBreakdown} />
        </div>

        {/* All Charters Table */}
        <AllChartersTable charters={data.topCharters} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch platform analytics:", error);
    return (
      <div className="p-8 mt-6 text-center bg-white border rounded-2xl border-slate-200">
        <BarChart3 className="w-12 h-12 mx-auto text-red-400" />
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Failed to Load Analytics
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          There was an error loading platform analytics data. Please try again
          later.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 p-2 text-left text-xs bg-slate-100 rounded overflow-auto max-w-lg mx-auto">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
      </div>
    );
  }
}
