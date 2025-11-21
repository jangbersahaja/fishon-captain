"use client";

import type { CharterPerformance } from "@/lib/charter-service";
import type { BookingStats } from "@/lib/services/booking-stats";
import type { EarningsSummary } from "@/lib/services/finance-service";
import { AnalyticsStatsCard } from "./AnalyticsStatsCard";
import { BookingStatsCardsCompact } from "./BookingStatsCardsCompact";
import { CharterPerformanceCard } from "./CharterPerformanceCard";
import { EarningsOverviewCard } from "./EarningsOverviewCard";

interface AnalyticsData {
  views: number;
  visitors: number;
  conversionRate: number;
  requests: number;
}

/**
 * Props for DashboardMetricsGrid container component
 *
 * @property bookingStats - Booking statistics (requests, upcoming, completed, cancellations, total value)
 * @property earningsData - Financial summary with period comparison
 * @property analyticsData - Marketplace visibility metrics (views, visitors, conversion rate, requests)
 * @property charterPerformance - Charter performance metrics array
 */
interface DashboardMetricsGridProps {
  bookingStats: BookingStats;
  earningsData: EarningsSummary;
  analyticsData: AnalyticsData;
  charterPerformance: CharterPerformance[];
}

/**
 * DashboardMetricsGrid - Main container for all dashboard metric cards
 *
 * Orchestrates responsive grid layout for dashboard overview section.
 * Responsive grid: 1 col mobile, 2 col tablet, 3 col desktop, 4 col xl+
 *
 * Layout order:
 * 1. BookingStatsCardsCompact (4 cards: Requests, Upcoming, Completed, Cancellations)
 * 2. EarningsOverviewCard (Revenue snapshot with comparison)
 * 3. AnalyticsStatsCard (Marketplace visibility)
 * 4. CharterPerformanceCard (Charter health metrics)
 *
 * @example
 * ```tsx
 * <DashboardMetricsGrid
 *   bookingStats={dashboard.bookingStats}
 *   earningsData={dashboard.earningsData}
 *   analyticsData={analytics}
 *   charterPerformance={dashboard.charterPerformance}
 * />
 * ```
 */
export function DashboardMetricsGrid({
  bookingStats,
  earningsData,
  analyticsData,
  charterPerformance,
}: DashboardMetricsGridProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Booking Stats Cards */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-4">
          <BookingStatsCardsCompact bookingStats={bookingStats} />
        </div>

        {/* Earnings Card */}
        <EarningsOverviewCard earningsData={earningsData} />

        {/* Analytics Card */}
        <AnalyticsStatsCard analyticsData={analyticsData} />

        {/* Charter Performance Card */}
        <CharterPerformanceCard charterPerformance={charterPerformance} />
      </div>
    </div>
  );
}
