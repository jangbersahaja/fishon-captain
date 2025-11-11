import {
  AnalyticsStatsCards,
  ConversionFunnel,
  ReferralSourcesChart,
  TopChartersTable,
  ViewsChart,
  type AnalyticsPeriod,
} from "@/components/captain/analytics";
import { AnalyticsPeriodSelector } from "@/components/captain/analytics/AnalyticsPeriodSelector";
import { getOwnerAnalytics } from "@/lib/analytics-service";
import { authOptions } from "@/lib/auth";
import { BarChart3 } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface AnalyticsPageProps {
  searchParams: Promise<{
    period?: string;
  }>;
}

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get period from search params (default to 30d)
  const params = await searchParams;
  const period = (params.period as AnalyticsPeriod) || "30d";

  // Validate period
  const validPeriods = ["7d", "30d", "90d", "1y"];
  if (!validPeriods.includes(period)) {
    redirect("/captain/analytics?period=30d");
  }

  return (
    <div className="px-4 py-8 mx-auto space-y-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track performance across all your owned charters
          </p>
        </div>
        <div className="flex gap-3">
          <AnalyticsPeriodSelector />
        </div>
      </div>

      {/* Analytics Content */}
      <Suspense fallback={<div>Loading...</div>}>
        <AnalyticsContent userId={session.user.id} period={period} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({
  userId,
  period,
}: {
  userId: string;
  period: AnalyticsPeriod;
}) {
  try {
    // Fetch owner analytics data
    const data = await getOwnerAnalytics(userId, period);

    // If no data, show empty state
    if (!data || data.summary.totalViews === 0) {
      return (
        <div className="p-8 mt-6 text-center bg-white border rounded-2xl border-slate-200">
          <BarChart3 className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No Analytics Data Yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Your owned charters will show analytics here once they get views.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <AnalyticsStatsCards summary={data.summary} />

        {/* Charts Row 1: Views Over Time */}
        <ViewsChart timeSeries={data.timeSeries} />

        {/* Charts Row 2: Conversion Funnel and Traffic Sources */}
        <div className="grid gap-6 md:grid-cols-2">
          <ConversionFunnel summary={data.summary} />
          <ReferralSourcesChart referralSources={data.referralSources} />
        </div>

        {/* Top Performing Charters */}
        <TopChartersTable topCharters={data.topCharters} />
      </div>
    );
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return (
      <div className="p-8 mt-6 text-center bg-white border rounded-2xl border-slate-200">
        <BarChart3 className="w-12 h-12 mx-auto text-red-400" />
        <h3 className="mt-4 text-base font-semibold text-slate-900">
          Failed to Load Analytics
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          There was an error loading your analytics data. Please try again
          later.
        </p>
      </div>
    );
  }
}
