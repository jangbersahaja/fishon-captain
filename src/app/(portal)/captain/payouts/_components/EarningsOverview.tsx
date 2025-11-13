import type { CaptainEarningsSummary } from "@/lib/services/finance-service";
import { TrendingDown, TrendingUp } from "lucide-react";

interface EarningsOverviewProps {
  summary: CaptainEarningsSummary;
}

export function EarningsOverview({ summary }: EarningsOverviewProps) {
  const monthlyChange =
    summary.totalEarningsLastMonth > 0
      ? ((summary.totalEarningsThisMonth - summary.totalEarningsLastMonth) /
          summary.totalEarningsLastMonth) *
        100
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Earnings */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Earnings</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              RM {summary.totalEarnings.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
            <span className="text-2xl">💰</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          From {summary.bookingCount} booking
          {summary.bookingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* This Month */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">This Month</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              RM {summary.totalEarningsThisMonth.toLocaleString()}
            </p>
          </div>
          {monthlyChange !== 0 && (
            <div
              className={`flex items-center gap-1 ${monthlyChange > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {monthlyChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {Math.abs(monthlyChange).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Last month: RM {summary.totalEarningsLastMonth.toLocaleString()}
        </p>
      </div>

      {/* Pending Payout */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Pending Payout</p>
            <p className="mt-1 text-2xl font-semibold text-amber-600">
              RM {summary.pendingPayout.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
            <span className="text-2xl">⏳</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {summary.nextPayoutDate
            ? `Next payout: ${summary.nextPayoutDate.toLocaleDateString("en-MY", { month: "short", day: "numeric" })}`
            : "No pending earnings"}
        </p>
      </div>

      {/* Completed Payouts */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Total Paid Out</p>
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
  );
}
