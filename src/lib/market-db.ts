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

// Raw Prisma booking type (with Decimal fields)
type PrismaMarketBooking = {
  id: string;
  userId: string | null;
  charterId: string;
  tripId: string;
  guests: unknown;
  tripPrice: { toNumber: () => number } | number;
  startTime: string | null;
  date: Date;
  days: number;
  finalPrice: { toNumber: () => number } | number;
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "PAID"
    | "CANCELLED"
    | "COMPLETED";
  expiresAt: Date;
  captainDecisionAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketBooking = {
  id: string;
  userId: string | null; // Nullable for guest bookings
  charterId: string; // Updated from captainCharterId
  tripId: string; // Trip reference
  guests: { adults: number; children: number } | null; // JSON field, typed as guest count object
  tripPrice: number; // Unit price at booking time
  startTime: string | null;
  date: Date;
  days: number;
  finalPrice: number; // Total calculated price
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "EXPIRED"
    | "PAID"
    | "CANCELLED"
    | "COMPLETED";
  expiresAt: Date;
  captainDecisionAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  // Guest booking fields
  guestFirstName: string | null;
  guestLastName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  emailVerified: boolean;
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
        charterId: {
          in: charterIds,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number and cast guests
    return bookings.map((b: PrismaMarketBooking) => ({
      ...b,
      tripPrice: Number(b.tripPrice),
      finalPrice: Number(b.finalPrice),
      guests: b.guests as { adults: number; children: number } | null,
    })) as MarketBooking[];
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

    if (!booking) {
      return null;
    }

    // Convert Decimal to number and cast guests
    return {
      ...booking,
      tripPrice: Number(booking.tripPrice),
      finalPrice: Number(booking.finalPrice),
      guests: booking.guests as { adults: number; children: number } | null,
    } as MarketBooking;
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
        charterId: {
          in: charterIds,
        },
        status,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert Decimal to number and cast guests
    return bookings.map((b: PrismaMarketBooking) => ({
      ...b,
      tripPrice: Number(b.tripPrice),
      finalPrice: Number(b.finalPrice),
      guests: b.guests as { adults: number; children: number } | null,
    })) as MarketBooking[];
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
      COMPLETED: 0,
    };
  }

  try {
    const [pending, approved, rejected, expired, paid, cancelled, completed] =
      await Promise.all([
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "PENDING" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "APPROVED" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "REJECTED" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "EXPIRED" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "PAID" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "CANCELLED" },
        }),
        prismaMarket.booking.count({
          where: { charterId: { in: charterIds }, status: "COMPLETED" },
        }),
      ]);

    return {
      PENDING: pending,
      APPROVED: approved,
      REJECTED: rejected,
      EXPIRED: expired,
      PAID: paid,
      CANCELLED: cancelled,
      COMPLETED: completed,
    };
  } catch (error) {
    console.error("Error counting bookings from Market DB:", error);
    throw new Error(
      "Failed to count bookings. Please check Market DB connection."
    );
  }
}
