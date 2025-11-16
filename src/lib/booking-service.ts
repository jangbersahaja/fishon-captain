import {
  enrichBooking,
  enrichBookings,
  type EnrichedMarketBooking,
} from "./enrich-booking";
import type { MarketBooking } from "./market-db";
import {
  countBookingsByStatus,
  fetchBookingById,
  fetchBookingsByCharters,
  fetchBookingsByStatus,
  isMarketDbConfigured,
} from "./market-db";

/**
 * Booking service for Captain app
 *
 * Provides unified interface to access booking data from Market DB.
 * All read operations use direct DB access for real-time data.
 * All write operations (approve/reject) should use Market API.
 */

/**
 * Get all bookings for a captain's charters
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Array of enriched bookings ordered by creation date (newest first)
 */
export async function getCaptainBookings(
  charterIds: string[]
): Promise<EnrichedMarketBooking[]> {
  if (!isMarketDbConfigured()) {
    console.warn(
      "Market DB not configured. Set MARKET_DATABASE_URL to enable booking features."
    );
    return [];
  }

  const bookings = await fetchBookingsByCharters(charterIds);
  return enrichBookings(bookings);
}

/**
 * Get a single booking by ID
 * @param bookingId - Booking ID
 * @returns Enriched booking or null if not found
 */
export async function getBooking(
  bookingId: string
): Promise<EnrichedMarketBooking | null> {
  if (!isMarketDbConfigured()) {
    console.warn(
      "Market DB not configured. Set MARKET_DATABASE_URL to enable booking features."
    );
    return null;
  }

  const booking = await fetchBookingById(bookingId);
  if (!booking) {
    return null;
  }

  return enrichBooking(booking);
}

/**
 * Get pending bookings for a captain (requires action)
 * Includes both PENDING (not yet approved) and PAYMENT_PENDING (payment received/authorized, awaiting approval)
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Array of enriched pending bookings
 */
export async function getPendingBookings(
  charterIds: string[]
): Promise<EnrichedMarketBooking[]> {
  if (!isMarketDbConfigured()) {
    return [];
  }

  // Fetch both PENDING and PAYMENT_PENDING statuses
  const [pendingBookings, paymentPendingBookings] = await Promise.all([
    fetchBookingsByStatus(charterIds, "PENDING"),
    fetchBookingsByStatus(charterIds, "PAYMENT_PENDING"),
  ]);

  // Combine and sort by creation date (newest first)
  const allPendingBookings = [
    ...pendingBookings,
    ...paymentPendingBookings,
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return enrichBookings(allPendingBookings);
}

/**
 * Get booking statistics for a captain
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Object with counts per status
 */
export async function getBookingStats(
  charterIds: string[]
): Promise<Record<MarketBooking["status"], number>> {
  if (!isMarketDbConfigured()) {
    return {
      PENDING: 0,
      PAYMENT_PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      EXPIRED: 0,
      PAID: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };
  }

  return countBookingsByStatus(charterIds);
}

/**
 * Approve a booking (calls Market API)
 * @param bookingId - Booking ID to approve
 * @returns Success status
 */
export async function approveBooking(bookingId: string): Promise<boolean> {
  const marketApiUrl =
    process.env.FISHON_MARKET_API_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!marketApiUrl) {
    throw new Error("FISHON_MARKET_API_URL not configured");
  }

  try {
    const response = await fetch(`${marketApiUrl}/api/bookings/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CAPTAIN_API_SECRET
          ? { "x-captain-api-secret": process.env.CAPTAIN_API_SECRET }
          : {}),
      },
      body: JSON.stringify({ id: bookingId }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `API returned ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(`Error approving booking ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Reject a booking (calls Market API)
 * @param bookingId - Booking ID to reject
 * @param reason - Optional rejection reason
 * @returns Success status
 */
export async function rejectBooking(
  bookingId: string,
  reason?: string
): Promise<boolean> {
  const marketApiUrl =
    process.env.FISHON_MARKET_API_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!marketApiUrl) {
    throw new Error("FISHON_MARKET_API_URL not configured");
  }

  try {
    const response = await fetch(`${marketApiUrl}/api/bookings/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CAPTAIN_API_SECRET
          ? { "x-captain-api-secret": process.env.CAPTAIN_API_SECRET }
          : {}),
      },
      body: JSON.stringify({ id: bookingId, reason }),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `API returned ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error(`Error rejecting booking ${bookingId}:`, error);
    throw error;
  }
}
