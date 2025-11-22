"use client";

import type { EarningsSummary } from "@/lib/services/finance-service";
import {
  Calendar,
  Clock,
  DollarSign,
  Percent,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/**
 * Props for EarningsOverviewCard
 *
 * @property earningsData - Earnings summary with current/previous period and payout info
 */
interface EarningsOverviewCardProps {
  earningsData: EarningsSummary;
}

/**
 * EarningsOverviewCard - Revenue snapshot with period comparison
 *
 * Displays captain's financial overview including:
 * - Current period earnings (large prominent value in Fishon red)
 * - Percentage change from previous period with trend indicator
 * - Pending payout amount
 * - Commission rate
 * - Next payout date
 *
 * Color scheme:
 * - Main value: Fishon red (#ec2227)
 * - Positive trend: Green
 * - Negative trend: Red
 *
 * @example
 * ```tsx
 * <EarningsOverviewCard
 *   earningsData={{
 *     currentPeriod: 5000,
 *     previousPeriod: 4500,
 *     percentChange: 11.11,
 *     pending: 1200,
 *     commissionRate: 10,
 *     nextPayoutDate: new Date("2025-12-05"),
 *   }}
 * />
 * ```
 */
export function EarningsOverviewCard({
  earningsData,
}: EarningsOverviewCardProps) {
  const isPositive = earningsData.percentChange >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? "text-green-600" : "text-red-600";
  const trendBg = isPositive ? "bg-green-50" : "bg-red-50";

  const nextPayoutDate = earningsData.nextPayoutDate
    ? new Date(earningsData.nextPayoutDate)
    : null;
  const formattedDate =
    nextPayoutDate?.toLocaleDateString("en-MY", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kuala_Lumpur",
    }) || "N/A";

  return (
    <div
      className="p-5 transition-all duration-200 bg-white border border-slate-200 rounded-2xl hover:shadow-md focus-within:ring-2 focus-within:ring-[#ec2227] focus-within:ring-offset-2"
      role="region"
      aria-label="Earnings overview"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-emerald-50 p-2.5">
          <DollarSign className="w-5 h-5 text-emerald-600" aria-hidden="true" />
        </div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Earnings
        </h3>
      </div>

      {/* Main Value */}
      <div className="mb-4">
        <p
          className="text-3xl font-bold text-[#ec2227]"
          aria-label={`Current period earnings: RM ${earningsData.currentPeriod.toLocaleString()}`}
        >
          RM {earningsData.currentPeriod.toLocaleString()}
        </p>
      </div>

      {/* Trend Indicator */}
      <div
        className={`flex items-center gap-2 mb-4 p-2.5 rounded-lg ${trendBg}`}
      >
        <TrendIcon className={`w-4 h-4 ${trendColor}`} aria-hidden="true" />
        <span className={`text-xs font-semibold ${trendColor}`}>
          {isPositive ? "+" : ""}
          {earningsData.percentChange.toFixed(1)}% from last period
        </span>
      </div>

      {/* Info Rows */}
      <div className="pt-3 space-y-3 border-t border-slate-100">
        {/* Pending */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Pending payout</span>
          </div>
          <span className="font-semibold text-slate-900">
            RM {earningsData.pending.toLocaleString()}
          </span>
        </div>

        {/* Commission Rate */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Percent className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Commission rate</span>
          </div>
          <span className="font-semibold text-slate-900">
            {earningsData.commissionRate}%
          </span>
        </div>

        {/* Next Payout */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span>Next payout</span>
          </div>
          <span className="font-semibold text-slate-900">{formattedDate}</span>
        </div>
      </div>
    </div>
  );
}
