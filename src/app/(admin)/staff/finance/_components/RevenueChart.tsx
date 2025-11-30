"use client";

import { format, parseISO } from "date-fns";
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

interface DailyRevenue {
  date: string;
  totalRevenue: number;
  platformRevenue: number;
  tripIncome: number;
  serviceIncome: number;
  bookingCount: number;
}

interface RevenueChartProps {
  data: DailyRevenue[];
  height?: number;
}

export function RevenueChart({ data, height = 300 }: RevenueChartProps) {
  // Format data for chart
  const chartData = data.map((day) => ({
    ...day,
    dateFormatted: format(parseISO(day.date), "MMM dd"),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
        <XAxis
          dataKey="dateFormatted"
          className="text-xs text-slate-600"
          tick={{ fill: "#64748b" }}
        />
        <YAxis
          className="text-xs text-slate-600"
          tick={{ fill: "#64748b" }}
          tickFormatter={(value) => `RM ${value.toLocaleString()}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null;

            const data = payload[0].payload;
            return (
              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  {data.dateFormatted}
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-600">Total Sales:</span>
                    <span className="text-xs font-semibold text-blue-600">
                      RM {data.totalRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-600">
                      Fishon Revenue:
                    </span>
                    <span className="text-xs font-semibold text-emerald-600">
                      RM {data.platformRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pl-2 border-l-2 border-emerald-200">
                    <span className="text-xs text-slate-500">Trip Income:</span>
                    <span className="text-xs text-emerald-500">
                      RM {data.tripIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pl-2 border-l-2 border-emerald-200">
                    <span className="text-xs text-slate-500">
                      Service Income:
                    </span>
                    <span className="text-xs text-emerald-500">
                      RM {data.serviceIncome.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-600">Bookings:</span>
                    <span className="text-xs font-semibold text-slate-900">
                      {data.bookingCount}
                    </span>
                  </div>
                </div>
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px" }}
          iconType="line"
          formatter={(value) => {
            if (value === "totalRevenue") return "Total Sales";
            if (value === "platformRevenue") return "Fishon Revenue";
            if (value === "tripIncome") return "Trip Income";
            if (value === "serviceIncome") return "Service Income";
            return value;
          }}
        />
        <Line
          type="monotone"
          dataKey="totalRevenue"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6", r: 3 }}
          activeDot={{ r: 5 }}
          name="totalRevenue"
        />
        <Line
          type="monotone"
          dataKey="platformRevenue"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: "#10b981", r: 3 }}
          activeDot={{ r: 5 }}
          name="platformRevenue"
        />
        <Line
          type="monotone"
          dataKey="tripIncome"
          stroke="#34d399"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={{ fill: "#34d399", r: 2 }}
          activeDot={{ r: 4 }}
          name="tripIncome"
        />
        <Line
          type="monotone"
          dataKey="serviceIncome"
          stroke="#6ee7b7"
          strokeWidth={1}
          strokeDasharray="3 3"
          dot={{ fill: "#6ee7b7", r: 2 }}
          activeDot={{ r: 4 }}
          name="serviceIncome"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
