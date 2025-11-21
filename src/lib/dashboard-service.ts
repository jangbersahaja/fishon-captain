/**
 * Dashboard Service
 * Main orchestrator for complete captain dashboard data
 */

import {
  getPriorityBookings,
  type PriorityBooking,
} from "@/lib/booking-priority";
import { getCaptainBookings } from "@/lib/booking-service";
import {
  getCharterPerformance,
  type CharterPerformance,
} from "@/lib/charter-service";
import { prisma } from "@/lib/prisma";
import {
  getBookingStats,
  type BookingStats,
} from "@/lib/services/booking-stats";
import {
  getEarningsSummary,
  type EarningsSummary,
} from "@/lib/services/finance-service";
import {
  generateSystemMessages,
  type SystemMessage,
} from "@/lib/services/system-messages";
import { getVerificationStatus } from "@/lib/services/verification-status";
import type { CaptainProfile } from "@prisma/client";

export type DashboardPeriod = "7d" | "30d" | "90d";

/**
 * Complete dashboard data aggregated from all services
 *
 * @property profile - Captain profile information
 * @property bookingStats - Aggregated booking statistics
 * @property priorityBookings - Bookings requiring immediate action
 * @property earningsData - Financial summary with period comparison
 * @property charterPerformance - Performance metrics for all charters
 * @property systemMessages - System announcements and alerts for captain
 */
export interface DashboardData {
  profile: CaptainProfile | null;
  bookingStats: BookingStats;
  priorityBookings: PriorityBooking[];
  earningsData: EarningsSummary;
  charterPerformance: CharterPerformance[];
  systemMessages: SystemMessage[];
}

/**
 * Get complete dashboard data for a captain
 *
 * Aggregates data from all dashboard services:
 * - Booking statistics (requests, upcoming, completed, cancellations, total value)
 * - Financial summary (earnings current/previous period, pending payouts)
 * - Charter performance (rating, booking count, media count)
 * - Priority bookings (new requests, upcoming trips, payment pending)
 * - System messages (verification status, banking info, compliance alerts)
 *
 * Data sources:
 * - Captain DB: User, CaptainProfile, Charter, CharterMedia, CaptainVerification, MessageDismissal
 * - Market DB: Booking, Review
 *
 * @param userId - Captain's user ID
 * @param period - Time period for statistics: "7d" (default), "30d", or "90d"
 * @returns Complete dashboard data object
 *
 * @example
 * const dashboard = await getDashboardData("user-123", "30d");
 * console.log(`Welcome ${dashboard.profile?.displayName}`);
 * console.log(`You have ${dashboard.bookingStats.requests} new booking requests`);
 * console.log(`Pending payout: $${dashboard.earningsData.pending}`);
 * console.log(`System messages: ${dashboard.systemMessages.length}`);
 */
export async function getDashboardData(
  userId: string,
  period: DashboardPeriod = "30d"
): Promise<DashboardData> {
  // Fetch captain profile with charters
  const profile = await prisma.captainProfile.findUnique({
    where: { userId },
    include: {
      charters: {
        select: { id: true },
      },
    },
  });

  // Get charter IDs for booking queries
  const charterIds = profile?.charters.map((c) => c.id) ?? [];
  const charterCount = charterIds.length;

  // Fetch all booking stats in parallel
  const bookingStats = await getBookingStats(userId, period);

  // Fetch earnings data
  const earningsData = await getEarningsSummary(userId, period);

  // Fetch charter performance metrics
  const charterPerformance = await getCharterPerformance(userId);

  // Fetch all bookings for priority calculation (using actual charter IDs)
  const allBookings = await getCaptainBookings(charterIds);

  // Calculate priority bookings
  const priorityBookings = getPriorityBookings(allBookings);

  // Fetch verification status and generate system messages
  const verification = await getVerificationStatus(userId);
  const systemMessages = await generateSystemMessages(
    verification,
    charterCount,
    userId
  );

  return {
    profile,
    bookingStats,
    priorityBookings,
    earningsData,
    charterPerformance,
    systemMessages,
  };
}

/**
 * Get dashboard data for comparison between periods
 *
 * Useful for showing trends and progress visualization
 *
 * @param userId - Captain's user ID
 * @returns Dashboard data for all three periods
 */
export async function getDashboardDataAllPeriods(
  userId: string
): Promise<Record<DashboardPeriod, DashboardData>> {
  const results = {} as Record<DashboardPeriod, DashboardData>;

  for (const period of ["7d", "30d", "90d"] as const) {
    results[period] = await getDashboardData(userId, period);
  }

  return results;
}
