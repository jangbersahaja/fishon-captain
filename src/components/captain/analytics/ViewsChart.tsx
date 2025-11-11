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

interface ViewsChartProps {
  timeSeries: TimeSeriesDataPoint[];
}

export function ViewsChart({ timeSeries }: ViewsChartProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Views & Bookings Over Time</CardTitle>
      </CardHeader>
      <CardContent>
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
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Views"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="uniqueVisitors"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: "#8b5cf6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Unique Visitors"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bookings"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
              name="Bookings"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
