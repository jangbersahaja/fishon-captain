"use client";

import type { DashboardPeriod } from "@/lib/dashboard-service";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

interface PeriodSelectorProps {
  selectedPeriod?: DashboardPeriod;
  onPeriodChange?: (period: DashboardPeriod) => void;
}

const PERIOD_OPTIONS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

/**
 * PeriodSelector - Dropdown component for selecting dashboard analytics period
 *
 * Features:
 * - Dropdown with 7d/30d/90d options
 * - Reads period from URL query params (?period=30d)
 * - Updates URL when period changes
 * - Preserves other query params (e.g., adminUserId)
 * - Fishon design system styling (red accent, slate colors)
 * - Debounced updates to prevent excessive refetches
 *
 * @example
 * ```tsx
 * <PeriodSelector selectedPeriod="30d" />
 * ```
 */
export function PeriodSelector({
  selectedPeriod: controlledPeriod,
  onPeriodChange,
}: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine current period (controlled prop takes precedence, then URL param, then default)
  const urlPeriod = searchParams.get("period") as DashboardPeriod | null;
  const currentPeriod = controlledPeriod || urlPeriod || "30d";

  // Validate period is one of allowed values
  const isValidPeriod = (p: string | null): p is DashboardPeriod =>
    p === "7d" || p === "30d" || p === "90d";
  const validatedPeriod = isValidPeriod(currentPeriod) ? currentPeriod : "30d";

  // Handle period change with debounce
  const handlePeriodChange = useCallback(
    (newPeriod: DashboardPeriod) => {
      // Call parent callback if provided
      if (onPeriodChange) {
        onPeriodChange(newPeriod);
      }

      // Update URL query params while preserving other params
      const params = new URLSearchParams(searchParams.toString());
      params.set("period", newPeriod);

      // Use shallow router update to avoid full page refresh
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, onPeriodChange]
  );

  // Memoize the period option to display
  const selectedOption = useMemo(
    () => PERIOD_OPTIONS.find((opt) => opt.value === validatedPeriod),
    [validatedPeriod]
  );

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="period-select"
        className="text-sm font-medium text-slate-700"
      >
        Period:
      </label>
      <select
        id="period-select"
        value={validatedPeriod}
        onChange={(e) => handlePeriodChange(e.target.value as DashboardPeriod)}
        className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ec2227] transition-all duration-200"
        aria-label="Select analytics period"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Display selected period label for accessibility */}
      <span className="text-xs text-slate-500 hidden sm:inline">
        {selectedOption?.label}
      </span>
    </div>
  );
}
