/**
 * Booking utility helpers
 *
 * Provides helper functions for booking status colors, action buttons,
 * and business logic calculations.
 */

/**
 * Calculate time remaining until expiry
 * @param expiresAt - Expiry date
 * @returns Object with time remaining info
 */
export function getTimeRemaining(expiresAt: Date): {
  isExpired: boolean;
  hoursRemaining: number;
  minutesRemaining: number;
  displayText: string;
} {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      isExpired: true,
      hoursRemaining: 0,
      minutesRemaining: 0,
      displayText: "Expired",
    };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  let displayText = "";
  if (hours > 0) {
    displayText = `${hours}h ${minutes}m remaining`;
  } else {
    displayText = `${minutes}m remaining`;
  }

  return {
    isExpired: false,
    hoursRemaining: hours,
    minutesRemaining: minutes,
    displayText,
  };
}

/**
 * Format date for display
 * @param date - Date object
 * @returns Formatted date string (e.g., "Nov 15, 2025 - Thursday")
 */
export function formatBookingDate(date: Date): string {
  return new Intl.DateTimeFormat("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/**
 * Format currency in Malaysian Ringgit
 * @param amount - Amount in cents/smallest unit
 * @returns Formatted currency string (e.g., "RM 350")
 */
export function formatCurrency(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY")}`;
}

/**
 * Calculate days until trip
 * @param tripDate - Trip date
 * @returns Number of days until trip (negative if past)
 */
export function getDaysUntilTrip(tripDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const trip = new Date(tripDate);
  trip.setHours(0, 0, 0, 0);
  const diff = trip.getTime() - now.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get countdown text for upcoming trip
 * @param tripDate - Trip date
 * @returns User-friendly countdown text
 */
export function getTripCountdown(tripDate: Date): string {
  const days = getDaysUntilTrip(tripDate);

  if (days < 0) {
    return "Completed";
  } else if (days === 0) {
    return "Today";
  } else if (days === 1) {
    return "Tomorrow";
  } else if (days < 7) {
    return `In ${days} days`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `In ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
  } else {
    const months = Math.floor(days / 30);
    return `In ${months} ${months === 1 ? "month" : "months"}`;
  }
}

/**
 * Convert 24-hour time to 12-hour format
 * @param startTime - Start time in 24-hour format (e.g., "14:30")
 * @returns Formatted time in 12-hour format (e.g., "2:30 PM")
 */
export function convert24to12Hour(startTime: string): string {
  // Split the time string into hours and minutes
  const [hours24, minutes] = startTime.split(":").map(Number);

  // Determine AM/PM
  const period = hours24 >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  let hours12 = hours24 % 12;
  // Handle midnight (00:xx becomes 12:xx AM)
  hours12 = hours12 === 0 ? 12 : hours12;

  // Format minutes to always have two digits
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;

  // Return the 12-hour formatted string
  return `${hours12}:${formattedMinutes} ${period}`;
}

/**
 * Format trip duration for display
 * @param durationHours - Duration in hours (optional)
 * @param days - Number of days (fallback)
 * @returns Formatted duration string (e.g., "8 hours", "2 days")
 */
export function formatTripDuration(
  durationHours?: number | null,
  days?: number
): string {
  if (durationHours && durationHours > 0) {
    return `${durationHours} ${durationHours === 1 ? "hour" : "hours"}`;
  }

  // Fallback: Calculate based on days (8 hours per day standard)
  if (days && days > 0) {
    const hours = days * 8;
    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  return "Duration TBD";
}

/**
 * Urgency level for booking expiration UX
 */
export type UrgencyLevel = "low" | "medium" | "high" | "expired";

/**
 * Get urgency level based on time remaining until expiration
 * @param expiresAt - Expiration date, or null if no expiration
 * @returns Urgency level or null if no expiration
 *
 * Thresholds:
 * - expired: Past expiration time
 * - high: < 6 hours remaining
 * - medium: < 24 hours remaining
 * - low: >= 24 hours remaining
 */
export function getUrgencyLevel(expiresAt: Date | null): UrgencyLevel | null {
  if (!expiresAt) return null;

  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  // Already expired
  if (diff <= 0) {
    return "expired";
  }

  const hoursRemaining = diff / (1000 * 60 * 60);

  // < 6 hours = high urgency (red)
  if (hoursRemaining < 6) {
    return "high";
  }

  // < 24 hours = medium urgency (yellow)
  if (hoursRemaining < 24) {
    return "medium";
  }

  // >= 24 hours = low urgency (green)
  return "low";
}

/**
 * Format expiration time remaining for display
 * @param expiresAt - Expiration date
 * @returns Formatted time string
 *
 * Format:
 * - >= 1 hour: "24h 30m"
 * - < 1 hour: "45m 30s"
 * - Expired: "Expired"
 */
export function formatExpirationTime(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) {
    return "Expired";
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // >= 1 hour: show "Xh Ym"
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }

  // < 1 hour: show "Xm Ys"
  return `${minutes}m ${seconds}s`;
}

/**
 * Get milliseconds remaining until expiration
 * @param expiresAt - Expiration date
 * @returns Milliseconds remaining (0 if expired, negative values treated as 0)
 */
export function getExpiresIn(expiresAt: Date): number {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  return Math.max(0, diff);
}
