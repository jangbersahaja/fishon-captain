"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";

interface StatusDistributionChartProps {
  data: { status: string; count: number }[];
}

const statusColors: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "bg-red-500", text: "text-red-700", label: "Pending" },
  AWAITING_PAYMENT: {
    bg: "bg-yellow-500",
    text: "text-yellow-700",
    label: "Awaiting Payment",
  },
  PAYMENT_AUTHORIZED: {
    bg: "bg-indigo-500",
    text: "text-indigo-700",
    label: "Payment Authorized",
  },
  PAID: { bg: "bg-green-500", text: "text-green-700", label: "Paid" },
  UNDER_REVIEW: {
    bg: "bg-orange-500",
    text: "text-orange-700",
    label: "Under Review",
  },
  COMPLETED: { bg: "bg-blue-500", text: "text-blue-700", label: "Completed" },
  REJECTED: { bg: "bg-slate-500", text: "text-slate-700", label: "Rejected" },
  CANCELLED: { bg: "bg-slate-400", text: "text-slate-600", label: "Cancelled" },
  EXPIRED: { bg: "bg-slate-300", text: "text-slate-500", label: "Expired" },
};

export function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Sort by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No booking data available
          </p>
        ) : (
          <div className="space-y-4">
            {/* Visual bar chart */}
            <div className="space-y-2">
              {sortedData.map((item) => {
                const colorConfig = statusColors[item.status] || {
                  bg: "bg-slate-400",
                  text: "text-slate-600",
                  label: item.status,
                };
                const percentage = ((item.count / total) * 100).toFixed(1);

                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${colorConfig.text}`}>
                        {colorConfig.label}
                      </span>
                      <span className="text-slate-600">
                        {item.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colorConfig.bg} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-slate-700">Total Bookings</span>
                <span className="text-slate-900">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
