"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Eye,
  Image,
  MessageCircle,
  MousePointer,
  Share2,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";

interface PlatformSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalBookingStarts: number;
  totalBookingSubmits: number;
  overallConversionRate: number;
  photoViews: number;
  videoViews: number;
  contactClicks: number;
  shareClicks: number;
}

interface PlatformStatsCardsProps {
  summary: PlatformSummary;
  previousSummary?: PlatformSummary;
}

export function PlatformStatsCards({
  summary,
  previousSummary,
}: PlatformStatsCardsProps) {
  const calculateChange = (
    current: number,
    previous?: number
  ): number | null => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  const formatChange = (change: number | null): string => {
    if (change === null) return "";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  // Primary metrics (larger cards)
  const primaryStats = [
    {
      title: "Total Views",
      value: summary.totalViews.toLocaleString(),
      change: calculateChange(summary.totalViews, previousSummary?.totalViews),
      icon: Eye,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Unique Visitors",
      value: summary.uniqueVisitors.toLocaleString(),
      change: calculateChange(
        summary.uniqueVisitors,
        previousSummary?.uniqueVisitors
      ),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Conversion Rate",
      value: `${summary.overallConversionRate.toFixed(1)}%`,
      change: calculateChange(
        summary.overallConversionRate,
        previousSummary?.overallConversionRate
      ),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Booking Requests",
      value: summary.totalBookingSubmits.toLocaleString(),
      change: calculateChange(
        summary.totalBookingSubmits,
        previousSummary?.totalBookingSubmits
      ),
      icon: CheckCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  // Secondary metrics (smaller cards)
  const secondaryStats = [
    {
      title: "Booking Starts",
      value: summary.totalBookingStarts.toLocaleString(),
      icon: MousePointer,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Photo Views",
      value: summary.photoViews.toLocaleString(),
      icon: Image,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      title: "Video Views",
      value: summary.videoViews.toLocaleString(),
      icon: Video,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Contact Clicks",
      value: summary.contactClicks.toLocaleString(),
      icon: MessageCircle,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Share Clicks",
      value: summary.shareClicks.toLocaleString(),
      icon: Share2,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {primaryStats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change !== null && stat.change >= 0;

          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change !== null && (
                  <div className="flex items-center gap-1 mt-1">
                    {isPositive ? (
                      <ArrowUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-600" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatChange(stat.change)}
                    </span>
                    <span className="text-xs text-gray-500">
                      vs previous period
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {secondaryStats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card key={stat.title} className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-lg font-semibold">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.title}</div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
