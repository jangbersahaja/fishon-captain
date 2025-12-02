"use client";

import type { EnhancedCharterConfig } from "@/lib/charter-service";
import { formatCurrency } from "@/lib/helpers/booking-helpers";
import { CalendarCheck, Eye, TrendingUp, Users } from "lucide-react";

interface CharterQuickStatsProps {
  charter: EnhancedCharterConfig;
}

export function CharterQuickStats({ charter }: CharterQuickStatsProps) {
  const stats = [
    {
      label: "Total Bookings",
      value: charter.bookingStats.total,
      icon: CalendarCheck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "This Month",
      value: charter.bookingStats.thisMonth,
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      label: "Max Capacity",
      value: charter.boat?.capacity || 0,
      suffix: "pax",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Active Trips",
      value: charter.trips.count,
      icon: Eye,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="p-3 bg-white border rounded-xl border-slate-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {stat.value}
            {stat.suffix && (
              <span className="ml-1 text-xs font-normal text-slate-500">
                {stat.suffix}
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

interface EarningsPreviewProps {
  charter: EnhancedCharterConfig;
}

export function EarningsPreview({ charter }: EarningsPreviewProps) {
  // Calculate estimated earnings from recent bookings
  const totalFromRecent = charter.recentBookings.reduce(
    (sum, b) => sum + b.totalPrice,
    0
  );

  return (
    <div className="p-4 border bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-green-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-green-800">
          Recent Earnings
        </span>
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
          Last 5 bookings
        </span>
      </div>
      <p className="text-2xl font-bold text-green-900">
        {formatCurrency(totalFromRecent)}
      </p>
      <p className="mt-1 text-xs text-green-700">
        From {charter.recentBookings.length} recent booking
        {charter.recentBookings.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
