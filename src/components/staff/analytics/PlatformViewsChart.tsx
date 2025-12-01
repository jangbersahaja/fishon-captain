"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TimeSeriesDataPoint {
  date: string;
  views: number;
  bookings: number;
  uniqueVisitors: number;
}

interface PlatformViewsChartProps {
  timeSeries: TimeSeriesDataPoint[];
}

export function PlatformViewsChart({ timeSeries }: PlatformViewsChartProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("en-MY", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // Prepare data with formatted dates
  const chartData = timeSeries.map((point) => ({
    ...point,
    displayDate: formatDate(point.date),
  }));

  // Calculate totals for the period
  const totals = timeSeries.reduce(
    (acc, point) => ({
      views: acc.views + point.views,
      bookings: acc.bookings + point.bookings,
      visitors: acc.visitors + point.uniqueVisitors,
    }),
    { views: 0, bookings: 0, visitors: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Platform Activity Over Time</CardTitle>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-blue-600">
                {totals.views.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total Views</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-purple-600">
                {totals.visitors.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Visitors</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">
                {totals.bookings.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Bookings</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No data available for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="displayDate"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
                labelStyle={{ fontWeight: 600, marginBottom: "4px" }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="line" />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="views"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", r: 3 }}
                activeDot={{ r: 5 }}
                name="Views"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="uniqueVisitors"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: "#8b5cf6", r: 3 }}
                activeDot={{ r: 5 }}
                name="Unique Visitors"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 5 }}
                name="Bookings"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
