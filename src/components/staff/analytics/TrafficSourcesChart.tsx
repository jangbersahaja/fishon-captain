"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface ReferralSource {
  source: string;
  count: number;
  percentage: number;
}

interface TrafficSourcesChartProps {
  referralSources: ReferralSource[];
}

// Color palette for different sources
const COLORS: Record<string, string> = {
  search: "#3b82f6", // Blue
  social: "#8b5cf6", // Purple
  direct: "#10b981", // Green
  referral: "#f59e0b", // Orange
  email: "#ef4444", // Red
  other: "#6b7280", // Gray
};

export function TrafficSourcesChart({
  referralSources,
}: TrafficSourcesChartProps) {
  // Calculate total for percentages
  const total = referralSources.reduce((sum, source) => sum + source.count, 0);

  // Prepare data with percentages and colors
  const chartData = referralSources.map((source) => ({
    name: source.source.charAt(0).toUpperCase() + source.source.slice(1),
    value: source.count,
    percentage: total > 0 ? ((source.count / total) * 100).toFixed(1) : "0.0",
    color: COLORS[source.source.toLowerCase()] || COLORS.other,
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Traffic Sources</CardTitle>
          <div className="text-sm text-gray-500">
            {total.toLocaleString()} views tracked
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No traffic data available for this period
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    "Views",
                  ]}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Traffic source breakdown */}
            <div className="mt-4 space-y-2">
              {chartData.map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {source.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {source.value.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {source.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
