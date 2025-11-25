"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  previousValue?: number;
  change?: number;
  description?: string;
  color?: "blue" | "emerald" | "amber" | "slate" | "purple";
  format?: "currency" | "number" | "percentage";
}

const colorClasses = {
  blue: {
    value: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  emerald: {
    value: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  amber: {
    value: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  slate: {
    value: "text-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-200",
  },
  purple: {
    value: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
};

function formatValue(
  value: number,
  format?: "currency" | "number" | "percentage"
) {
  if (format === "currency") {
    return `RM ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  if (format === "percentage") {
    return `${value.toFixed(2)}%`;
  }
  return value.toLocaleString();
}

export function MetricCard({
  title,
  value,
  previousValue,
  change,
  description,
  color = "slate",
  format,
}: MetricCardProps) {
  const colors = colorClasses[color];

  // Format display value
  const displayValue =
    typeof value === "number" ? formatValue(value, format) : value;

  return (
    <div className={`p-4 bg-white border rounded-xl ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-600">{title}</div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              change > 0
                ? "text-emerald-600"
                : change < 0
                  ? "text-red-600"
                  : "text-slate-500"
            }`}
          >
            {change > 0 ? (
              <ArrowUp className="w-3 h-3" />
            ) : change < 0 ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>

      <div className={`text-2xl font-semibold ${colors.value} mb-1`}>
        {displayValue}
      </div>

      {description && (
        <div className="text-xs text-slate-500">{description}</div>
      )}

      {previousValue !== undefined && (
        <div className="text-xs text-slate-400 mt-1">
          Previous: {formatValue(previousValue, format)}
        </div>
      )}
    </div>
  );
}
