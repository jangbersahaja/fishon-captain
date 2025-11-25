/**
 * Date range utilities for financial dashboards
 * Provides preset ranges and comparison logic
 */

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "mtd"
  | "custom";

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

export interface DateRangeComparison {
  current: DateRange;
  previous: DateRange;
  comparisonLabel: string;
}

/**
 * Get date range for a preset
 */
export function getPresetDateRange(
  preset: DateRangePreset,
  customRange?: { from: Date; to: Date }
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today": {
      return {
        from: new Date(today),
        to: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        ),
        label: "Today",
      };
    }

    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        from: new Date(yesterday),
        to: new Date(
          yesterday.getFullYear(),
          yesterday.getMonth(),
          yesterday.getDate(),
          23,
          59,
          59,
          999
        ),
        label: "Yesterday",
      };
    }

    case "7d": {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        from: sevenDaysAgo,
        to: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        ),
        label: "Last 7 Days",
      };
    }

    case "30d": {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        from: thirtyDaysAgo,
        to: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        ),
        label: "Last 30 Days",
      };
    }

    case "mtd": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        from: monthStart,
        to: new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59,
          999
        ),
        label: "Month to Date",
      };
    }

    case "custom": {
      if (!customRange) {
        throw new Error("Custom range requires from and to dates");
      }
      return {
        from: customRange.from,
        to: customRange.to,
        label: `${formatDate(customRange.from)} - ${formatDate(customRange.to)}`,
      };
    }

    default:
      return getPresetDateRange("7d");
  }
}

/**
 * Get comparison range (previous period with same duration)
 */
export function getComparisonRange(current: DateRange): DateRangeComparison {
  const duration = current.to.getTime() - current.from.getTime();
  const previousTo = new Date(current.from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);

  let comparisonLabel = "vs Previous Period";

  // Smart labels for common presets
  if (duration < 86400000) {
    // Less than a day
    comparisonLabel = "vs Yesterday";
  } else if (duration === 86400000 * 7) {
    // 7 days
    comparisonLabel = "vs Previous 7 Days";
  } else if (duration <= 86400000 * 31) {
    // Roughly a month
    comparisonLabel = "vs Previous Month";
  }

  return {
    current,
    previous: {
      from: previousFrom,
      to: previousTo,
      label: `${formatDate(previousFrom)} - ${formatDate(previousTo)}`,
    },
    comparisonLabel,
  };
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * Format percentage with sign and color indicator
 */
export function formatPercentageChange(change: number): {
  text: string;
  trend: "up" | "down" | "neutral";
  color: string;
} {
  const absChange = Math.abs(change);
  const text = `${change > 0 ? "+" : ""}${absChange.toFixed(1)}%`;

  let trend: "up" | "down" | "neutral" = "neutral";
  let color = "text-slate-600";

  if (change > 0) {
    trend = "up";
    color = "text-emerald-600";
  } else if (change < 0) {
    trend = "down";
    color = "text-red-600";
  }

  return { text, trend, color };
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
  return `${formatDate(range.from)} - ${formatDate(range.to)}`;
}

/**
 * Get all available presets
 */
export function getAvailablePresets(): Array<{
  value: DateRangePreset;
  label: string;
}> {
  return [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "mtd", label: "Month to Date" },
    { value: "custom", label: "Custom Range" },
  ];
}

/**
 * Check if a date range is valid
 */
export function isValidDateRange(from: Date, to: Date): boolean {
  return from <= to && to <= new Date();
}
