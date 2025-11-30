import type {
  CaptainEarningsSummary,
  TimePeriod,
} from "@/lib/services/finance-service";
import { TrendingDown, TrendingUp } from "lucide-react";

interface EarningsOverviewProps {
  summary: CaptainEarningsSummary;
  period: TimePeriod;
}

export function EarningsOverview({ summary, period }: EarningsOverviewProps) {
  const periodChange =
    summary.totalEarningsLastPeriod > 0
      ? ((summary.totalEarningsThisPeriod - summary.totalEarningsLastPeriod) /
          summary.totalEarningsLastPeriod) *
        100
      : summary.totalEarningsThisPeriod > 0
        ? 100
        : 0;

  return (
    <div className="space-y-4">
      {/* Period Earnings - Show for ALL periods */}
      <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              {summary.periodLabel} Earnings
            </p>
            <p className="mt-1 text-3xl font-bold text-blue-900">
              RM {summary.totalEarningsThisPeriod.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-blue-700">
              {summary.bookingCountThisPeriod} booking
              {summary.bookingCountThisPeriod !== 1 ? "s" : ""}
            </p>
          </div>
          {period !== "all" && periodChange !== 0 && (
            <div
              className={`flex items-center gap-1 ${periodChange > 0 ? "text-green-700" : "text-red-700"}`}
            >
              {periodChange > 0 ? (
                <TrendingUp className="w-5 h-5" />
              ) : (
                <TrendingDown className="w-5 h-5" />
              )}
              <span className="text-lg font-bold">
                {periodChange > 0 ? "+" : ""}
                {periodChange.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {period !== "all" && summary.totalEarningsLastPeriod > 0 && (
          <p className="mt-3 text-xs text-blue-600">
            vs previous period: RM{" "}
            {summary.totalEarningsLastPeriod.toLocaleString()}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Pending Settlement */}
        <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending Settlement</p>
              <p className="mt-1 text-2xl font-semibold text-amber-600">
                RM {summary.pendingPayout.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Processed 3-5 days after trip completion
          </p>
        </div>

        {/* Completed Payments */}
        <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Received</p>
              <p className="mt-1 text-2xl font-semibold text-green-600">
                RM {summary.completedPayouts.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <span className="text-2xl">✓</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Commission: {(summary.commissionRate * 100).toFixed(0)}% (
            {summary.commissionRate === 0.05
              ? "Gold"
              : summary.commissionRate === 0.08
                ? "Silver"
                : "Basic"}{" "}
            plan)
          </p>
        </div>
      </div>
    </div>
  );
}
