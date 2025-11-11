"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Eye,
  TrendingUp,
  Users,
} from "lucide-react";

interface StatsSummary {
  totalViews: number;
  uniqueVisitors: number;
  bookingConversion: number;
  bookingStarts: number;
  bookingSubmits: number;
}

interface AnalyticsStatsCardsProps {
  summary: StatsSummary;
  previousSummary?: StatsSummary; // For comparison/trends
}

export function AnalyticsStatsCards({
  summary,
  previousSummary,
}: AnalyticsStatsCardsProps) {
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

  const conversionRate = summary.bookingConversion;
  const previousConversionRate = previousSummary
    ? previousSummary.bookingConversion * 100
    : undefined;

  const stats = [
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
      title: "Booking Conversion",
      value: `${conversionRate.toFixed(1)}%`,
      change: calculateChange(conversionRate, previousConversionRate),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Booking Requests",
      value: summary.bookingSubmits.toLocaleString(),
      change: calculateChange(
        summary.bookingSubmits,
        previousSummary?.bookingSubmits
      ),
      icon: CheckCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
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
  );
}
