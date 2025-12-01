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

interface EventTypeBreakdown {
  eventType: string;
  count: number;
  percentage: number;
}

interface EventBreakdownChartProps {
  eventTypeBreakdown: EventTypeBreakdown[];
}

// Color palette for different event types
const EVENT_COLORS: Record<string, string> = {
  CHARTER_VIEW: "#3b82f6", // Blue
  PHOTO_VIEW: "#ec4899", // Pink
  VIDEO_VIEW: "#ef4444", // Red
  BOOKING_STARTED: "#f59e0b", // Amber
  BOOKING_SUBMITTED: "#10b981", // Green
  CONTACT_CLICK: "#14b8a6", // Teal
  SHARE_CLICKED: "#f97316", // Orange
  PROFILE_VIEW: "#8b5cf6", // Purple
  CHARTER_SEARCH: "#6366f1", // Indigo
  REVIEW_VIEW: "#a855f7", // Violet
};

// Human-readable event type names
const EVENT_LABELS: Record<string, string> = {
  CHARTER_VIEW: "Charter Views",
  PHOTO_VIEW: "Photo Views",
  VIDEO_VIEW: "Video Views",
  BOOKING_STARTED: "Booking Started",
  BOOKING_SUBMITTED: "Booking Submitted",
  CONTACT_CLICK: "Contact Clicks",
  SHARE_CLICKED: "Share Clicks",
  PROFILE_VIEW: "Profile Views",
  CHARTER_SEARCH: "Search Appearances",
  REVIEW_VIEW: "Review Views",
};

export function EventBreakdownChart({
  eventTypeBreakdown,
}: EventBreakdownChartProps) {
  // Calculate total for display
  const total = eventTypeBreakdown.reduce((sum, event) => sum + event.count, 0);

  // Prepare data with colors and labels
  const chartData = eventTypeBreakdown.map((event) => ({
    name: EVENT_LABELS[event.eventType] || event.eventType,
    value: event.count,
    percentage: event.percentage,
    color: EVENT_COLORS[event.eventType] || "#6b7280",
  }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Event Breakdown</CardTitle>
          <div className="text-sm text-gray-500">
            {total.toLocaleString()} total events
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-gray-500">
            No events recorded for this period
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
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
                    name,
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

            {/* Event type list with counts */}
            <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto">
              {chartData.map((event) => (
                <div
                  key={event.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {event.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">
                      {event.value.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-500 w-12 text-right">
                      {event.percentage.toFixed(1)}%
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
