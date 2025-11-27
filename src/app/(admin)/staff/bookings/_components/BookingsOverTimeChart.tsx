"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useState } from "react";

interface BookingsOverTimeChartProps {
  data: { date: string; count: number; revenue?: number }[];
}

export function BookingsOverTimeChart({ data }: BookingsOverTimeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const avgPerDay = data.length > 0 ? (total / data.length).toFixed(1) : "0";

  // Chart dimensions
  const height = 250;
  const width = 800; // Internal SVG coordinate system
  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Y-axis scale
  // Ensure we have at least 4 ticks and they are integers
  const yMax = Math.max(Math.ceil(maxCount * 1.1), 4);
  const yTicks = 4;

  // Helper to get X coordinate
  const getX = (index: number) => {
    if (data.length <= 1) return chartWidth / 2;
    return (index / (data.length - 1)) * chartWidth;
  };

  // Helper to get Y coordinate
  const getY = (value: number) => {
    return chartHeight - (value / yMax) * chartHeight;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Bookings Over Time
          <span className="ml-auto text-xs font-normal text-slate-500">
            Last 30 days
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-2">
          {/* Stats Row */}
          <div className="flex gap-8 mb-6">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Total Bookings
              </p>
              <p className="text-2xl font-bold text-slate-900">{total}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Daily Average
              </p>
              <p className="text-2xl font-bold text-slate-900">{avgPerDay}</p>
            </div>
            {total > 0 && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Peak Day
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {maxCount}
                  <span className="text-sm font-normal text-slate-500 ml-1">
                    bookings
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="relative w-full aspect-[2/1] min-h-[200px]">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Grid Lines & Y-Axis Labels */}
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                {Array.from({ length: yTicks + 1 }).map((_, i) => {
                  const value = (yMax / yTicks) * i;
                  const y = getY(value);
                  return (
                    <g key={i}>
                      <line
                        x1={0}
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray={i === 0 ? "" : "4 4"}
                      />
                      <text
                        x={-10}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-slate-400 font-medium"
                      >
                        {Math.round(value)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Bars */}
              <g transform={`translate(${margin.left}, ${margin.top})`}>
                {data.map((d, i) => {
                  const x = getX(i);
                  const barHeight = chartHeight - getY(d.count);
                  const barWidth = Math.max(
                    (chartWidth / data.length) * 0.6,
                    4
                  ); // Min width 4px

                  return (
                    <g key={i}>
                      <rect
                        x={x - barWidth / 2}
                        y={getY(d.count)}
                        width={barWidth}
                        height={barHeight}
                        fill={hoveredIndex === i ? "#2563eb" : "#3b82f6"}
                        rx={2}
                        className="transition-colors duration-200"
                      />
                      {/* Invisible hit area for hover */}
                      <rect
                        x={x - chartWidth / data.length / 2}
                        y={0}
                        width={chartWidth / data.length}
                        height={chartHeight}
                        fill="transparent"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className="cursor-pointer"
                      />
                    </g>
                  );
                })}
              </g>

              {/* X Axis Labels */}
              <g
                transform={`translate(${margin.left}, ${
                  height - margin.bottom + 20
                })`}
              >
                {data.map((d, i) => {
                  // Show label every 5 days or if it's the first/last
                  // Also ensure we don't show last label if it's too close to the previous one
                  const showLabel =
                    i === 0 ||
                    i === data.length - 1 ||
                    (i % 5 === 0 && i < data.length - 2);

                  if (!showLabel) return null;

                  return (
                    <text
                      key={i}
                      x={getX(i)}
                      y={0}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-medium"
                    >
                      {formatDate(d.date)}
                    </text>
                  );
                })}
              </g>
            </svg>

            {/* Tooltip Overlay */}
            {hoveredIndex !== null && (
              <div
                className="absolute pointer-events-none z-10"
                style={{
                  left: `${
                    ((margin.left + getX(hoveredIndex)) / width) * 100
                  }%`,
                  top: "10%",
                  transform: "translateX(-50%)",
                }}
              >
                <div className="bg-slate-900 text-white text-xs rounded-md px-3 py-2 shadow-xl flex flex-col items-center min-w-[100px]">
                  <span className="font-semibold mb-1">
                    {formatDate(data[hoveredIndex].date)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300 font-bold text-lg">
                      {data[hoveredIndex].count}
                    </span>
                    <span className="text-slate-300 text-[10px] uppercase">
                      Bookings
                    </span>
                  </div>
                  {data[hoveredIndex].revenue !== undefined &&
                    data[hoveredIndex].revenue > 0 && (
                      <div className="text-slate-400 mt-1 pt-1 border-t border-slate-700 w-full text-center">
                        RM {data[hoveredIndex].revenue.toLocaleString()}
                      </div>
                    )}
                  {/* Arrow */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-900" />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
