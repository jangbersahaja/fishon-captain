/**
 * Booking Stats Service
 * Aggregates booking statistics for dashboard metrics
 */

import { prisma } from "@/lib/prisma";
import { isMarketDbConfigured, prismaMarket } from "@/lib/prisma-market";

export type PeriodType = "7d" | "30d" | "90d";

/**
 * Booking statistics aggregated by various dimensions
 *
 * @property requests - Number of PENDING or PAYMENT_AUTHORIZED bookings (awaiting captain action)
 * @property upcoming - Number of PAID bookings with future trip dates
 * @property completed - Number of COMPLETED bookings in the period
 * @property cancellations - Number of CANCELLED + REJECTED bookings in the period
 * @property totalValue - Sum of finalPrice for PAID bookings in the period
 */
export interface BookingStats {
  requests: number;
  upcoming: number;
  completed: number;
  cancellations: number;
  totalValue: number;
}

/**
 * Calculate date range for a given period from today
 *
 * @param period - "7d" (last 7 days), "30d" (last 30 days), or "90d" (last 90 days)
 * @returns Object with startDate and endDate boundaries
 */
function getPeriodDateRange(period: PeriodType): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of today

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0); // Start of that day

  return { startDate, endDate };
}

/**
 * Get booking statistics for a captain filtered by period
 *
 * Queries the Market DB Booking table to aggregate statistics across all captain's charters.
 * Statistics include requests pending action, upcoming trips, completed bookings, and total value.
 *
 * Data sources:
 * - Captain DB: Charter table (to get all charters for this captain)
 * - Market DB: Booking table (status, date, finalPrice, createdAt, updatedAt)
 *
 * @param captainId - The captain's user ID (maps to Charter.ownerId)
 * @param period - Time period to analyze: "7d" (default), "30d", or "90d"
 * @returns Object with aggregated booking statistics
 *
 * @example
 * const stats = await getBookingStats("user-123", "30d");
 * console.log(stats.requests); // Number of pending requests
 * console.log(stats.totalValue); // Total booking value in period
 */
export async function getBookingStats(
  captainId: string,
  period: PeriodType = "30d"
): Promise<BookingStats> {
  if (!isMarketDbConfigured()) {
    return {
      requests: 0,
      upcoming: 0,
      completed: 0,
      cancellations: 0,
      totalValue: 0,
    };
  }

  const { startDate, endDate } = getPeriodDateRange(period);
  const now = new Date();

  // First, fetch all charter IDs for this captain from captain DB
  const charters = await prisma.charter.findMany({
    where: { ownerId: captainId },
    select: { id: true },
  });

  if (charters.length === 0) {
    return {
      requests: 0,
      upcoming: 0,
      completed: 0,
      cancellations: 0,
      totalValue: 0,
    };
  }

  const charterIds = charters.map((c) => c.id);

  // Fetch all bookings for these charters within the period
  const bookings = await prismaMarket.booking.findMany({
    where: {
      charterId: { in: charterIds },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      status: true,
      date: true,
      finalPrice: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Use bookings directly since they're already filtered to captain's charters
  const captainBookings = bookings;

  let requests = 0;
  let upcoming = 0;
  let completed = 0;
  let cancellations = 0;
  let totalValue = 0;

  for (const booking of captainBookings) {
    // Count requests: PENDING or PAYMENT_AUTHORIZED
    if (
      booking.status === "PENDING" ||
      booking.status === "PAYMENT_AUTHORIZED"
    ) {
      requests++;
    }

    // Count completed bookings
    if (booking.status === "COMPLETED") {
      completed++;
    }

    // Count cancellations: CANCELLED or REJECTED
    if (booking.status === "CANCELLED" || booking.status === "REJECTED") {
      cancellations++;
    }

    // Count upcoming: PAID bookings with future trip dates
    if (booking.status === "PAID" && booking.date) {
      const tripDate = new Date(booking.date);
      if (tripDate.getTime() > now.getTime()) {
        upcoming++;
      }
    }

    // Sum total value: PAID bookings only
    if (booking.status === "PAID" && booking.finalPrice) {
      const price =
        typeof booking.finalPrice === "number"
          ? booking.finalPrice
          : Number(booking.finalPrice);
      if (!isNaN(price)) {
        totalValue += price;
      }
    }
  }

  return {
    requests,
    upcoming,
    completed,
    cancellations,
    totalValue: Math.round(totalValue * 100) / 100, // Round to 2 decimals
  };
}

/**
 * Get booking statistics across multiple periods for comparison
 *
 * Useful for showing trend analysis (current period vs previous period)
 *
 * @param captainId - The captain's ID
 * @param periods - Array of periods to fetch stats for
 * @returns Map of period to BookingStats
 */
export async function getBookingStatsByPeriods(
  captainId: string,
  periods: PeriodType[] = ["7d", "30d"]
): Promise<Record<PeriodType, BookingStats>> {
  const results: Record<PeriodType, BookingStats> = {} as Record<
    PeriodType,
    BookingStats
  >;

  for (const period of periods) {
    results[period] = await getBookingStats(captainId, period);
  }

  return results;
}
