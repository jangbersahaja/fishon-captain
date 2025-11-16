import { formatDate } from "./datetime";
import type { EnrichedMarketBooking } from "./enrich-booking";

/**
 * Booking priority utility functions
 * Handles urgency calculation, filtering, and categorization for the captain booking dashboard
 */

export type PriorityType = "new-request" | "upcoming-trip" | "payment-pending";
export type UrgencyLevel = "high" | "medium" | "low";

export interface PriorityBooking {
  id: string;
  type: PriorityType;
  urgency: UrgencyLevel;
  booking: EnrichedMarketBooking;
  countdown?: string;
  action: string;
  hoursAgo?: number; // For sorting
  daysUntil?: number; // For sorting
}

/**
 * Calculate time difference in a human-readable format
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  return `${diffDays} days ago`;
}

/**
 * Calculate time until a date in a human-readable format
 */
function getTimeUntil(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 0) {
    return "Overdue";
  }
  if (diffHours < 24) {
    return `In ${diffHours}h`;
  }
  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }
  if (diffDays < 7) {
    return `In ${diffDays} days`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) {
    return "In 1 week";
  }
  return `In ${diffWeeks} weeks`;
}

/**
 * Check if booking is a new request (PENDING or PAYMENT_PENDING < 24h old)
 * PAYMENT_PENDING = payment received/authorized, awaiting captain approval
 */
function isNewRequest(booking: EnrichedMarketBooking): boolean {
  // Include both PENDING and PAYMENT_PENDING as they both need captain action
  if (booking.status !== "PENDING" && booking.status !== "PAYMENT_PENDING") {
    return false;
  }

  const now = new Date();
  const hoursAgo =
    (now.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursAgo < 24;
}

/**
 * Check if booking is upcoming trip (PAID, date within 7 days)
 */
function isUpcomingTrip(booking: EnrichedMarketBooking): boolean {
  if (booking.status !== "PAID") return false;

  const now = new Date();
  const tripDate = new Date(booking.date);
  const daysUntil =
    (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  return daysUntil >= 0 && daysUntil <= 7;
}

/**
 * Check if payment is pending (APPROVED > 48h, no payment)
 */
function isPaymentPending(booking: EnrichedMarketBooking): boolean {
  if (booking.status !== "APPROVED") return false;

  const now = new Date();
  const updatedAt = booking.updatedAt || booking.createdAt;
  const hoursAgo = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);

  return hoursAgo > 48;
}

/**
 * Get priority bookings that need attention
 */
export function getPriorityBookings(
  bookings: EnrichedMarketBooking[]
): PriorityBooking[] {
  const priorityBookings: PriorityBooking[] = [];

  for (const booking of bookings) {
    // New requests
    if (isNewRequest(booking)) {
      const now = new Date();
      const hoursAgo =
        (now.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, 24 - hoursAgo);

      priorityBookings.push({
        id: booking.id,
        type: "new-request",
        urgency:
          hoursRemaining < 6 ? "high" : hoursRemaining < 12 ? "medium" : "low",
        booking,
        countdown: `${Math.floor(hoursRemaining)}h remaining`,
        action: "Review Request",
        hoursAgo,
      });
    }

    // Upcoming trips
    if (isUpcomingTrip(booking)) {
      const now = new Date();
      const tripDate = new Date(booking.date);
      const daysUntil =
        (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      priorityBookings.push({
        id: booking.id,
        type: "upcoming-trip",
        urgency: daysUntil < 2 ? "high" : daysUntil < 5 ? "medium" : "low",
        booking,
        countdown: getTimeUntil(tripDate),
        action: "Prepare Trip",
        daysUntil,
      });
    }

    // Payment pending
    if (isPaymentPending(booking)) {
      const now = new Date();
      const updatedAt = booking.updatedAt || booking.createdAt;
      const daysWaiting = Math.floor(
        (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      priorityBookings.push({
        id: booking.id,
        type: "payment-pending",
        urgency: daysWaiting > 5 ? "high" : daysWaiting > 3 ? "medium" : "low",
        booking,
        countdown: `Waiting ${daysWaiting} days`,
        action: "Follow Up",
        daysUntil: daysWaiting,
      });
    }
  }

  // Sort: new requests (oldest first), then upcoming trips (soonest first), then payment pending (longest waiting)
  return priorityBookings.sort((a, b) => {
    // Group by type first
    const typeOrder = {
      "new-request": 0,
      "upcoming-trip": 1,
      "payment-pending": 2,
    };
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type];
    }

    // Within same type, sort by urgency
    if (a.type === "new-request") {
      return (b.hoursAgo || 0) - (a.hoursAgo || 0); // Oldest first
    }
    if (a.type === "upcoming-trip") {
      return (a.daysUntil || 0) - (b.daysUntil || 0); // Soonest first
    }
    if (a.type === "payment-pending") {
      return (b.daysUntil || 0) - (a.daysUntil || 0); // Longest waiting first
    }

    return 0;
  });
}

/**
 * Filter bookings by tab type
 */
export type BookingTabType = "requests" | "upcoming" | "all" | "history";

export function filterBookingsByTab(
  bookings: EnrichedMarketBooking[],
  tab: BookingTabType
): EnrichedMarketBooking[] {
  const now = new Date();

  switch (tab) {
    case "requests":
      // PENDING and PAYMENT_PENDING statuses (both require captain action)
      return bookings.filter(
        (b) => b.status === "PENDING" || b.status === "PAYMENT_PENDING"
      );

    case "upcoming":
      // PAID bookings with date <= 30 days from now
      return bookings.filter((b) => {
        if (b.status !== "PAID") return false;
        const tripDate = new Date(b.date);
        const daysUntil =
          (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil >= 0 && daysUntil <= 30;
      });

    case "all":
      // All bookings
      return bookings;

    case "history":
      // COMPLETED, REJECTED, CANCELLED, EXPIRED, or past PAID bookings
      return bookings.filter((b) => {
        if (
          ["COMPLETED", "REJECTED", "CANCELLED", "EXPIRED"].includes(b.status)
        ) {
          return true;
        }
        // Past PAID bookings (trip date has passed)
        if (b.status === "PAID") {
          const tripDate = new Date(b.date);
          return tripDate.getTime() < now.getTime();
        }
        return false;
      });

    default:
      return bookings;
  }
}

/**
 * Get booking counts by tab
 */
export function getTabCounts(
  bookings: EnrichedMarketBooking[]
): Record<BookingTabType, number> {
  return {
    requests: filterBookingsByTab(bookings, "requests").length,
    upcoming: filterBookingsByTab(bookings, "upcoming").length,
    all: bookings.length,
    history: filterBookingsByTab(bookings, "history").length,
  };
}

/**
 * Format booking date in human-readable format
 */
export function formatBookingDate(date: Date): string {
  const now = new Date();
  const tripDate = new Date(date);
  const diffDays = Math.floor(
    (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `In ${diffDays} days`;

  return formatDate(tripDate, {
    month: "short",
    day: "numeric",
    year: tripDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get time since booking was created
 */
export function getTimeSinceCreated(createdAt: Date): string {
  return getTimeAgo(createdAt);
}
