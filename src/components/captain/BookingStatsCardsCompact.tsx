"use client";

import type { BookingStats } from "@/lib/services/booking-stats";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

/**
 * Props for BookingStatsCardsCompact
 *
 * @property bookingStats - Booking statistics object with requests, upcoming, completed, cancellations, totalValue
 */
interface BookingStatsCardsCompactProps {
  bookingStats: BookingStats;
}

/**
 * StatCard - Individual stat card component
 */
interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
  iconColor: string;
  trend?: number;
}

function StatCard({
  label,
  value,
  icon,
  bgColor,
  iconColor: _iconColor,
  trend,
}: StatCardProps) {
  const isPositive = trend ? trend >= 0 : false;
  const trendColor = isPositive ? "text-green-600" : "text-red-600";
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-[#ec2227] focus-within:ring-offset-2">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2.5 ${bgColor}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-xs font-medium tracking-wide uppercase text-slate-600">
            {label}
          </p>
          <div className="flex items-end gap-2 mt-2">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {trend !== undefined && (
              <div
                className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}
              >
                <TrendIcon className="w-3 h-3" />
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * BookingStatsCardsCompact - Grid of 4 compact booking stat cards
 *
 * Displays key booking metrics in a responsive grid:
 * - Requests: Pending bookings awaiting captain response
 * - Confirmed: Confirmed bookings in the future
 * - Completed: Finished trips (paid bookings in the past)
 * - Cancellations: Total cancelled or rejected bookings
 *
 * Responsive layout:
 * - Mobile: 1 column
 * - Tablet: 2 columns
 * - Desktop: 4 columns (usually spans full width in parent grid)
 *
 * @example
 * ```tsx
 * <BookingStatsCardsCompact
 *   bookingStats={{
 *     requests: 3,
 *     Confirmed: 5,
 *     completed: 12,
 *     cancellations: 1,
 *     totalValue: 2500,
 *   }}
 * />
 * ```
 */
export function BookingStatsCardsCompact({
  bookingStats,
}: BookingStatsCardsCompactProps) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      role="region"
      aria-label="Booking statistics"
    >
      <StatCard
        label="Requests"
        value={bookingStats.requests}
        icon={<Clock className="w-5 h-5 text-amber-600" />}
        bgColor="bg-amber-50"
        iconColor="text-amber-600"
      />

      <StatCard
        label="Confirmed"
        value={bookingStats.upcoming}
        icon={<Calendar className="w-5 h-5 text-blue-600" />}
        bgColor="bg-blue-50"
        iconColor="text-blue-600"
      />

      <StatCard
        label="Completed"
        value={bookingStats.completed}
        icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
        bgColor="bg-green-50"
        iconColor="text-green-600"
      />

      <StatCard
        label="Cancellations"
        value={bookingStats.cancellations}
        icon={<AlertCircle className="w-5 h-5 text-red-600" />}
        bgColor="bg-red-50"
        iconColor="text-red-600"
      />
    </div>
  );
}
