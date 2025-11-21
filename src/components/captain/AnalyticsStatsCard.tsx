"use client";

import { Eye, MessageSquare, TrendingUp, Users } from "lucide-react";

/**
 * Props for AnalyticsStatsCard
 *
 * @property analyticsData - Analytics metrics with views, visitors, conversion rate, requests
 */
interface AnalyticsStatsCardProps {
  analyticsData: {
    views: number;
    visitors: number;
    conversionRate: number;
    requests: number;
  };
}

/**
 * Analytics stat item component
 */
interface AnalyticsStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bgColor: string;
  suffix?: string;
}

function AnalyticsStat({
  label,
  value,
  icon,
  bgColor,
  suffix,
}: AnalyticsStatProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors duration-200">
      <div className={`rounded-lg p-2 ${bgColor}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-600 truncate font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900">
          {typeof value === "number" ? value.toLocaleString() : value}
          {suffix && (
            <span className="text-sm font-semibold ml-1">{suffix}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * AnalyticsStatsCard - Marketplace visibility metrics
 *
 * Displays charter marketplace visibility and performance metrics:
 * - Views: Total profile views from anglers
 * - Visitors: Unique visitors to charter profile
 * - Conversion Rate: Percentage of visitors who request booking
 * - Requests: Total booking requests from views
 *
 * Shows "Coming Soon" state if analytics data is unavailable.
 *
 * @example
 * ```tsx
 * <AnalyticsStatsCard
 *   analyticsData={{
 *     views: 1250,
 *     visitors: 342,
 *     conversionRate: 2.5,
 *     requests: 3,
 *   }}
 * />
 * ```
 */
export function AnalyticsStatsCard({ analyticsData }: AnalyticsStatsCardProps) {
  const hasData =
    analyticsData.views > 0 ||
    analyticsData.visitors > 0 ||
    analyticsData.conversionRate > 0 ||
    analyticsData.requests > 0;

  return (
    <div
      className="p-5 bg-white border border-slate-200 rounded-2xl hover:shadow-md transition-all duration-200 focus-within:ring-2 focus-within:ring-[#ec2227] focus-within:ring-offset-2"
      role="region"
      aria-label="Analytics statistics"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-lg bg-purple-50 p-2.5">
          <Eye className="w-5 h-5 text-purple-600" aria-hidden="true" />
        </div>
        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Analytics
        </h3>
      </div>

      {hasData ? (
        <div className="space-y-1">
          <AnalyticsStat
            label="Profile Views"
            value={analyticsData.views}
            icon={<Eye className="w-4 h-4 text-purple-600" />}
            bgColor="bg-purple-50"
          />

          <AnalyticsStat
            label="Unique Visitors"
            value={analyticsData.visitors}
            icon={<Users className="w-4 h-4 text-blue-600" />}
            bgColor="bg-blue-50"
          />

          <AnalyticsStat
            label="Conversion Rate"
            value={analyticsData.conversionRate.toFixed(1)}
            icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            bgColor="bg-green-50"
            suffix="%"
          />

          <AnalyticsStat
            label="Booking Requests"
            value={analyticsData.requests}
            icon={<MessageSquare className="w-4 h-4 text-amber-600" />}
            bgColor="bg-amber-50"
          />
        </div>
      ) : (
        <div className="py-6 text-center">
          <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Coming Soon</p>
          <p className="text-xs text-slate-400 mt-1">
            Analytics will appear once you have views
          </p>
        </div>
      )}
    </div>
  );
}
