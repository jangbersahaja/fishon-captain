export { isMarketDbConfigured };

import { isMarketDbConfigured, prismaMarket } from "./prisma-market";

/**
 * Read-only database accessors for Booking and Review data from Market DB.
 *
 * This module provides safe read access to the Market database's Booking and Review tables.
 * The database user (captain_readonly) has SELECT-only permissions.
 *
 * All write operations should go through Market API endpoints.
 * For review data access, use review-service.ts.
 */

// Participant in a booking
export type BookingParticipant = {
  name: string;
  phone: string;
  isBooker: boolean;
};

// Time slot for a booking day
export type BookingTimeSlot = {
  day: number;
  date: string;
  startDateTime: string;
  endDateTime: string;
};

// Raw Prisma booking type (with Decimal fields)
type PrismaMarketBooking = {
  id: string;
  userId: string;
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
    | "AWAITING_PAYMENT"
    | "PAYMENT_AUTHORIZED"
    | "PAID"
    | "UNDER_REVIEW"
    | "COMPLETED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  expiresAt: Date;
  captainDecisionAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  captainResponse: string | null;
  timeSlots: unknown;
  paymentTransactionId: string | null;
  paymentMethod: string | null;
  paymentFlow: string | null;
  paymentNote: string | null;
  paymentIntentId: string | null;
  paymentAuthorizedAt: Date | null;
  paymentCapturedAt: Date | null;
  paymentReleasedAt: Date | null;
  bookingFlowType: "MANUAL" | "AUTO";
  platformFee: { toNumber: () => number } | number | null;
  serviceFee: { toNumber: () => number } | number | null;
  captainEarnings: { toNumber: () => number } | number | null;
  refundStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  refundAmount: { toNumber: () => number } | number | null;
  refundedAt: Date | null;
  refundReason: string | null;
  chatId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MarketBooking = {
  id: string;
  userId: string;
  charterId: string;
  tripId: string;
  guests: {
    adults: number;
    children: number;
    participants?: BookingParticipant[];
  } | null;
  tripPrice: number;
  startTime: string | null;
  date: Date;
  days: number;
  finalPrice: number;
  status:
    | "PENDING"
    | "AWAITING_PAYMENT"
    | "PAYMENT_AUTHORIZED"
    | "PAID"
    | "UNDER_REVIEW"
    | "COMPLETED"
    | "REJECTED"
    | "CANCELLED"
    | "EXPIRED";
  expiresAt: Date;
  captainDecisionAt: Date | null;
  note: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  captainResponse: string | null;
  timeSlots: BookingTimeSlot[] | null;
  paymentTransactionId: string | null;
  paymentMethod: string | null;
  paymentFlow: string | null;
  paymentNote: string | null;
  paymentIntentId: string | null;
  paymentAuthorizedAt: Date | null;
  paymentCapturedAt: Date | null;
  paymentReleasedAt: Date | null;
  bookingFlowType: "MANUAL" | "AUTO";
  platformFee: number | null;
  serviceFee: number | null;
  captainEarnings: number | null;
  refundStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | null;
  refundAmount: number | null;
  refundedAt: Date | null;
  refundReason: string | null;
  chatId: string | null;
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

    // Convert Decimal to number and cast JSON fields
    return {
      ...booking,
      tripPrice: Number(booking.tripPrice),
      finalPrice: Number(booking.finalPrice),
      platformFee: booking.platformFee ? Number(booking.platformFee) : null,
      serviceFee: booking.serviceFee ? Number(booking.serviceFee) : null,
      captainEarnings: booking.captainEarnings
        ? Number(booking.captainEarnings)
        : null,
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      guests: booking.guests as MarketBooking["guests"],
      timeSlots: booking.timeSlots as BookingTimeSlot[] | null,
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

    // Convert Decimal to number and cast JSON fields
    return bookings.map((b: PrismaMarketBooking) => ({
      ...b,
      tripPrice: Number(b.tripPrice),
      finalPrice: Number(b.finalPrice),
      platformFee: b.platformFee ? Number(b.platformFee) : null,
      serviceFee: b.serviceFee ? Number(b.serviceFee) : null,
      captainEarnings: b.captainEarnings ? Number(b.captainEarnings) : null,
      refundAmount: b.refundAmount ? Number(b.refundAmount) : null,
      guests: b.guests as MarketBooking["guests"],
      timeSlots: b.timeSlots as BookingTimeSlot[] | null,
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

  if (!isMarketDbConfigured()) {
    return {
      PENDING: 0,
      AWAITING_PAYMENT: 0,
      PAYMENT_AUTHORIZED: 0,
      PAID: 0,
      UNDER_REVIEW: 0,
      COMPLETED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
    };
  }

  try {
    const [
      pending,
      awaitingPayment,
      paymentAuthorized,
      paid,
      underReview,
      completed,
      rejected,
      cancelled,
      expired,
    ] = await Promise.all([
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "PENDING" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "AWAITING_PAYMENT" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "PAYMENT_AUTHORIZED" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "PAID" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "UNDER_REVIEW" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "COMPLETED" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "REJECTED" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "CANCELLED" },
      }),
      prismaMarket.booking.count({
        where: { charterId: { in: charterIds }, status: "EXPIRED" },
      }),
    ]);

    return {
      PENDING: pending,
      AWAITING_PAYMENT: awaitingPayment,
      PAYMENT_AUTHORIZED: paymentAuthorized,
      PAID: paid,
      UNDER_REVIEW: underReview,
      COMPLETED: completed,
      REJECTED: rejected,
      CANCELLED: cancelled,
      EXPIRED: expired,
    };
  } catch (error) {
    console.error("Error counting bookings from Market DB:", error);
    throw new Error(
      "Failed to count bookings. Please check Market DB connection."
    );
  }
}
