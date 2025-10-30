/**
 * Date/Time Utilities - All times in Malaysia timezone (Asia/Kuala_Lumpur, GMT+8)
 */

export const MALAYSIA_TIMEZONE = "Asia/Kuala_Lumpur";

export function formatDateTime(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return "—";

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (!dateObj || isNaN(dateObj.getTime())) {
      return "—";
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: MALAYSIA_TIMEZONE,
    };

    return new Intl.DateTimeFormat("en-MY", {
      ...defaultOptions,
      ...options,
      timeZone: MALAYSIA_TIMEZONE,
    }).format(dateObj);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "—";
  }
}

export function formatDate(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return "—";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: MALAYSIA_TIMEZONE,
  };

  return formatDateTime(date, {
    ...defaultOptions,
    ...options,
    hour: undefined,
    minute: undefined,
    second: undefined,
    hour12: undefined,
  });
}

export function formatRelative(
  date: Date | string | number | null | undefined
): string {
  if (!date) return "—";

  try {
    const dateObj =
      typeof date === "string" || typeof date === "number"
        ? new Date(date)
        : date;

    if (!dateObj || isNaN(dateObj.getTime())) {
      return "—";
    }

    const now = Date.now();
    const then = dateObj.getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec}s ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;

    return formatDate(dateObj);
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "—";
  }
}

// Helper: time ago string
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Get today's date in Malaysia timezone as YYYY-MM-DD string
 */
export function getTodayMY(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MALAYSIA_TIMEZONE,
  });

  // en-CA locale formats as YYYY-MM-DD
  return formatter.format(now);
}

/**
 * Convert any Date object to YYYY-MM-DD string in Malaysia timezone
 */
export function toDateStringMY(date: Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MALAYSIA_TIMEZONE,
  });

  // en-CA locale formats as YYYY-MM-DD
  return formatter.format(date);
}
