"use client";

import { CalendarDays } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface DateRangeFilterProps {
  currentDateFrom: string;
  currentDateTo: string;
}

type DatePreset = {
  label: string;
  value: string;
  getRange: () => { from: string; to: string };
};

const datePresets: DatePreset[] = [
  {
    label: "Today",
    value: "today",
    getRange: () => {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      return { from: dateStr, to: dateStr };
    },
  },
  {
    label: "This Week",
    value: "week",
    getRange: () => {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        from: startOfWeek.toISOString().split("T")[0],
        to: endOfWeek.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "This Month",
    value: "month",
    getRange: () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        from: startOfMonth.toISOString().split("T")[0],
        to: endOfMonth.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 30 Days",
    value: "30days",
    getRange: () => {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return {
        from: thirtyDaysAgo.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    },
  },
  {
    label: "Last 90 Days",
    value: "90days",
    getRange: () => {
      const today = new Date();
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(today.getDate() - 90);
      return {
        from: ninetyDaysAgo.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    },
  },
];

export function DateRangeFilter({
  currentDateFrom,
  currentDateTo,
}: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePresetChange = (preset: DatePreset | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (preset) {
      const { from, to } = preset.getRange();
      params.set("dateFrom", from);
      params.set("dateTo", to);
    } else {
      params.delete("dateFrom");
      params.delete("dateTo");
    }

    params.delete("page"); // Reset pagination
    router.push(`/staff/bookings?${params.toString()}`);
  };

  const handleCustomDateChange = (type: "from" | "to", value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(type === "from" ? "dateFrom" : "dateTo", value);
    } else {
      params.delete(type === "from" ? "dateFrom" : "dateTo");
    }

    params.delete("page"); // Reset pagination
    router.push(`/staff/bookings?${params.toString()}`);
  };

  const hasDateFilter = currentDateFrom || currentDateTo;

  // Determine if a preset matches the current date range
  const getCurrentPreset = (): string | null => {
    if (!currentDateFrom || !currentDateTo) return null;

    for (const preset of datePresets) {
      const { from, to } = preset.getRange();
      if (from === currentDateFrom && to === currentDateTo) {
        return preset.value;
      }
    }
    return "custom";
  };

  const currentPreset = getCurrentPreset();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
        <CalendarDays className="w-3.5 h-3.5" />
        <span>Date:</span>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => handlePresetChange(null)}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
            !hasDateFilter
              ? "bg-slate-900 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          All Time
        </button>
        {datePresets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition ${
              currentPreset === preset.value
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={currentDateFrom}
          onChange={(e) => handleCustomDateChange("from", e.target.value)}
          className="px-2 py-1 text-xs border rounded-md border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-500"
          aria-label="From date"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={currentDateTo}
          onChange={(e) => handleCustomDateChange("to", e.target.value)}
          className="px-2 py-1 text-xs border rounded-md border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-500"
          aria-label="To date"
        />
      </div>
    </div>
  );
}
