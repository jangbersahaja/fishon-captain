export { isMarketDbConfigured };

import { isMarketDbConfigured, prismaMarket } from "./prisma-market";

/**
 * Read-only database accessors for Booking data from Market DB.
 *
 * This module provides safe read access to the Market database's Booking table.
 * The database user (captain_readonly) has SELECT-only permissions.
 *
 * All write operations (approve/reject) should go through Market API endpoints.
 */

export type MarketBooking = {
  id: string;
  userId: string;
  captainCharterId: string;
  charterName: string;
  location: string;
  tripName: string;
  unitPrice: number;
  startTime: string | null;
  date: Date;
  days: number;
  adults: number;
  children: number;
  totalPrice: number;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "PAID"
    | "CANCELLED";
  expiresAt: Date;
  captainDecisionAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Fetch all bookings for specific charter(s)
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Array of bookings
 */
export async function fetchBookingsByCharters(
  charterIds: string[]
): Promise<MarketBooking[]> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  if (!charterIds.length) {
    return [];
  }

  try {
    const bookings = await prismaMarket.booking.findMany({
      where: {
        captainCharterId: {
          in: charterIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return bookings as MarketBooking[];
  } catch (error) {
    console.error("Error fetching bookings from Market DB:", error);
    throw new Error(
      "Failed to fetch bookings. Please check Market DB connection."
    );
  }
}

/**
 * Fetch single booking by ID
 * @param bookingId - Booking ID
 * @returns Booking or null if not found
 */
export async function fetchBookingById(
  bookingId: string
): Promise<MarketBooking | null> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  try {
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
    });

    return booking as MarketBooking | null;
  } catch (error) {
    console.error(`Error fetching booking ${bookingId} from Market DB:`, error);
    throw new Error(
      `Failed to fetch booking ${bookingId}. Please check Market DB connection.`
    );
  }
}

/**
 * Fetch bookings with status filter
 * @param charterIds - Array of charter IDs owned by the captain
 * @param status - Booking status to filter by
 * @returns Array of bookings
 */
export async function fetchBookingsByStatus(
  charterIds: string[],
  status: MarketBooking["status"]
): Promise<MarketBooking[]> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  if (!charterIds.length) {
    return [];
  }

  try {
    const bookings = await prismaMarket.booking.findMany({
      where: {
        captainCharterId: {
          in: charterIds,
        },
        status,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return bookings as MarketBooking[];
  } catch (error) {
    console.error(`Error fetching ${status} bookings from Market DB:`, error);
    throw new Error(
      `Failed to fetch ${status} bookings. Please check Market DB connection.`
    );
  }
}

/**
 * Count bookings by status for a captain's charters
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Object with counts per status
 */
export async function countBookingsByStatus(
  charterIds: string[]
): Promise<Record<MarketBooking["status"], number>> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  if (!charterIds.length) {
    return {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      PAID: 0,
      CANCELLED: 0,
    };
  }

  try {
    const [pending, approved, rejected, expired, paid, cancelled] =
      await Promise.all([
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "PENDING" },
        }),
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "APPROVED" },
        }),
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "REJECTED" },
        }),
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "EXPIRED" },
        }),
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "PAID" },
        }),
        prismaMarket.booking.count({
          where: { captainCharterId: { in: charterIds }, status: "CANCELLED" },
        }),
      ]);

    return {
      PENDING: pending,
      APPROVED: approved,
      REJECTED: rejected,
      EXPIRED: expired,
      PAID: paid,
      CANCELLED: cancelled,
    };
  } catch (error) {
    console.error("Error counting bookings from Market DB:", error);
    throw new Error(
      "Failed to count bookings. Please check Market DB connection."
    );
  }
}
