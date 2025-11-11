"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown } from "lucide-react";

interface ConversionFunnelProps {
  summary: {
    totalViews: number;
    uniqueVisitors: number;
    bookingStarts: number;
    bookingSubmits: number;
  };
}

export function ConversionFunnel({ summary }: ConversionFunnelProps) {
  // Calculate conversion rates
  const stages = [
    {
      label: "Total Views",
      value: summary.totalViews,
      percentage: 100,
      width: 100,
      color: "bg-blue-500",
    },
    {
      label: "Unique Visitors",
      value: summary.uniqueVisitors,
      percentage:
        summary.totalViews > 0
          ? (summary.uniqueVisitors / summary.totalViews) * 100
          : 0,
      width:
        summary.totalViews > 0
          ? (summary.uniqueVisitors / summary.totalViews) * 100
          : 0,
      color: "bg-purple-500",
    },
    {
      label: "Booking Initiated",
      value: summary.bookingStarts,
      percentage:
        summary.uniqueVisitors > 0
          ? (summary.bookingStarts / summary.uniqueVisitors) * 100
          : 0,
      width:
        summary.totalViews > 0
          ? (summary.bookingStarts / summary.totalViews) * 100
          : 0,
      color: "bg-orange-500",
    },
    {
      label: "Booking Submitted",
      value: summary.bookingSubmits,
      percentage:
        summary.bookingStarts > 0
          ? (summary.bookingSubmits / summary.bookingStarts) * 100
          : 0,
      width:
        summary.totalViews > 0
          ? (summary.bookingSubmits / summary.totalViews) * 100
          : 0,
      color: "bg-green-500",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {stage.label}
                </span>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-900">
                    {stage.value.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({stage.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Funnel bar */}
              <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className={`absolute left-0 top-0 h-full ${stage.color} transition-all duration-500 flex items-center justify-center`}
                  style={{ width: `${Math.max(stage.width, 5)}%` }}
                >
                  {stage.width > 15 && (
                    <span className="text-white text-xs font-semibold">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow between stages */}
              {index < stages.length - 1 && (
                <div className="flex justify-center my-2">
                  <ArrowDown className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Conversion summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">View to Submit</div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.totalViews > 0
                  ? (
                      (summary.bookingSubmits / summary.totalViews) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">Start to Submit</div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.bookingStarts > 0
                  ? (
                      (summary.bookingSubmits / summary.bookingStarts) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                %
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
