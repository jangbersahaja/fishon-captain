/**
 * Charter Service - Enhanced charter configuration data fetching
 *
 * Provides comprehensive charter data including:
 * - Basic charter info
 * - Booking flow settings
 * - Boat configuration
 * - Captain and crew assignments
 * - Active trips
 * - Last booking info and stats (from fishon-market DB)
 */

import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";

export interface EnhancedCharterConfig {
  // Basic info
  id: string;
  name: string;
  charterType: string;
  city: string;
  state: string;
  startingPoint: string;
  isActive: boolean;
  isLocked: boolean; // Admin-only: prevents captain from changing isActive

  // Booking flow settings
  bookingFlowType: "MANUAL" | "AUTO";
  approvalTimeHours: number;
  instantBookingEnabled: boolean;

  // Configuration
  boat: {
    id: string;
    name: string;
    type: string;
    lengthFt: number;
    capacity: number;
    imageUrl: string | null;
  } | null;

  captain: {
    id: string;
    userId: string;
    name: string;
    email: string | null;
  };

  crew: {
    count: number;
    members: Array<{
      id: string;
      name: string;
      role: string;
    }>;
  };

  trips: {
    count: number;
    active: Array<{
      id: string;
      name: string;
      type: string;
      price: number;
      duration: number;
      maxPax: number;
    }>;
  };

  media: {
    count: number;
  };

  // Booking activity (from fishon-market DB)
  lastBooking: {
    id: string;
    guestName: string;
    totalPrice: number;
    tripDate: Date;
    tripTime: string;
    status: string;
    adults: number;
    children: number;
    tripName: string;
    tripType: string;
    createdAt: Date;
  } | null;

  recentBookings: Array<{
    id: string;
    guestName: string;
    totalPrice: number;
    tripDate: Date;
    tripTime: string;
    status: string;
    adults: number;
    children: number;
    tripName: string;
    createdAt: Date;
  }>;

  bookingStats: {
    total: number;
    thisMonth: number;
  };
}

/**
 * Get enhanced configuration for a single charter
 */
export async function getEnhancedCharterConfig(
  charterId: string
): Promise<EnhancedCharterConfig> {
  // Fetch from captain DB
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: {
      id: true,
      name: true,
      charterType: true,
      city: true,
      state: true,
      startingPoint: true,
      isActive: true,
      isLocked: true,
      bookingFlowType: true,
      approvalTimeHours: true,
      instantBookingEnabled: true,
      boat: {
        select: {
          id: true,
          name: true,
          type: true,
          lengthFt: true,
          capacity: true,
          imageUrl: true,
        },
      },
      captain: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      crewAssignments: {
        where: { isActive: true },
        include: {
          crew: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      },
      trips: {
        take: 5,
        select: {
          id: true,
          name: true,
          tripType: true,
          price: true,
          durationHours: true,
          maxAnglers: true,
        },
      },
      _count: {
        select: {
          media: true,
        },
      },
    },
  });

  if (!charter) {
    throw new Error(`Charter not found: ${charterId}`);
  }

  // Fetch booking data from market DB (if configured)
  let lastBooking = null;
  let recentBookings: Array<{
    id: string;
    guestName: string;
    totalPrice: number;
    tripDate: Date;
    tripTime: string;
    status: string;
    adults: number;
    children: number;
    tripName: string;
    createdAt: Date;
  }> = [];
  let bookingTotal = 0;
  let thisMonthCount = 0;

  try {
    // Fetch recent bookings (last 5)
    const recentBookingsData = await prismaMarket.booking.findMany({
      where: { charterId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        user: {
          select: {
            name: true,
          },
        },
        guests: true,
        tripId: true,
        finalPrice: true,
        date: true,
        startTime: true,
        status: true,
        createdAt: true,
      },
    });

    // Fetch trip info from captain DB for all tripIds
    const tripIds: string[] = recentBookingsData
      .map((b: (typeof recentBookingsData)[0]) => b.tripId)
      .filter((id: string | null): id is string => !!id);
    const uniqueTripIds = [...new Set(tripIds)];
    const tripsData =
      uniqueTripIds.length > 0
        ? await prisma.trip.findMany({
            where: { id: { in: uniqueTripIds } },
            select: { id: true, name: true, tripType: true },
          })
        : [];
    const tripMap = new Map(tripsData.map((t) => [t.id, t]));

    // Helper to extract guest name from booking
    const getGuestName = (booking: (typeof recentBookingsData)[0]): string => {
      // Try user name first
      if (booking.user?.name) return booking.user.name;
      // Try participants array in guests JSON
      const guests = booking.guests as {
        adults?: number;
        children?: number;
        participants?: Array<{ name?: string; isBooker?: boolean }>;
      } | null;
      const booker = guests?.participants?.find((p) => p.isBooker);
      if (booker?.name) return booker.name;
      // Fallback
      return "Guest";
    };

    // Helper to get guest counts from JSON
    const getGuestCounts = (
      booking: (typeof recentBookingsData)[0]
    ): { adults: number; children: number } => {
      const guests = booking.guests as {
        adults?: number;
        children?: number;
      } | null;
      return {
        adults: guests?.adults ?? 0,
        children: guests?.children ?? 0,
      };
    };

    recentBookings = recentBookingsData.map(
      (booking: (typeof recentBookingsData)[0]) => {
        const guestCounts = getGuestCounts(booking);
        const trip = tripMap.get(booking.tripId);
        return {
          id: booking.id,
          guestName: getGuestName(booking),
          totalPrice: Number(booking.finalPrice),
          tripDate: new Date(booking.date),
          tripTime: booking.startTime || "",
          status: booking.status,
          adults: guestCounts.adults,
          children: guestCounts.children,
          tripName: trip?.name || "Trip",
          createdAt: booking.createdAt,
        };
      }
    );

    // Set last booking as the first one
    if (recentBookingsData.length > 0) {
      const lastBookingData = recentBookingsData[0];
      const guestCounts = getGuestCounts(lastBookingData);
      const trip = tripMap.get(lastBookingData.tripId);
      lastBooking = {
        id: lastBookingData.id,
        guestName: getGuestName(lastBookingData),
        totalPrice: Number(lastBookingData.finalPrice),
        tripDate: new Date(lastBookingData.date),
        tripTime: lastBookingData.startTime || "",
        status: lastBookingData.status,
        adults: guestCounts.adults,
        children: guestCounts.children,
        tripName: trip?.name || "Trip",
        tripType: trip?.tripType || "Unknown",
        createdAt: lastBookingData.createdAt,
      };
    }

    // Get booking stats
    const bookingStats = await prismaMarket.booking.aggregate({
      where: { charterId },
      _count: true,
    });
    bookingTotal = bookingStats._count || 0;

    // Get this month's bookings
    const thisMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    thisMonthCount = await prismaMarket.booking.count({
      where: {
        charterId,
        createdAt: { gte: thisMonth },
      },
    });
  } catch (error) {
    console.warn(
      `Failed to fetch booking data for charter ${charterId}:`,
      error
    );
    // Continue without booking data
  }

  // Transform data
  return {
    id: charter.id,
    name: charter.name,
    charterType: charter.charterType,
    city: charter.city,
    state: charter.state,
    startingPoint: charter.startingPoint,
    isActive: charter.isActive,
    isLocked: charter.isLocked,
    bookingFlowType: charter.bookingFlowType,
    approvalTimeHours: charter.approvalTimeHours,
    instantBookingEnabled: charter.instantBookingEnabled,
    boat: charter.boat,
    captain: {
      id: charter.captain.id,
      userId: charter.captain.userId,
      name: charter.captain.user.name || "Captain",
      email: charter.captain.user.email || "",
    },
    crew: {
      count: charter.crewAssignments.length,
      members: charter.crewAssignments.map((ca) => ({
        id: ca.crew.id,
        name: ca.crew.displayName,
        role: ca.role,
      })),
    },
    trips: {
      count: charter.trips?.length || 0,
      active:
        charter.trips?.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.tripType,
          price: Number(t.price),
          duration: t.durationHours,
          maxPax: t.maxAnglers,
        })) || [],
    },
    media: {
      count: charter._count.media,
    },
    lastBooking,
    recentBookings,
    bookingStats: {
      total: bookingTotal,
      thisMonth: thisMonthCount,
    },
  };
}

/**
 * Get enhanced configurations for all charters owned by a user
 */
export async function getEnhancedChartersList(
  userId: string
): Promise<EnhancedCharterConfig[]> {
  const charters = await prisma.charter.findMany({
    where: { ownerId: userId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  // Fetch each charter's config in parallel
  const configs = await Promise.all(
    charters.map((c) => getEnhancedCharterConfig(c.id))
  );

  return configs;
}

/**
 * Charter performance summary for dashboard
 *
 * @property id - Charter ID
 * @property name - Charter name
 * @property isActive - Whether charter is currently active
 * @property rating - Average rating (from reviews/ratings)
 * @property bookingCount - Total count of PAID/COMPLETED bookings
 * @property mediaCount - Total media items (photos/videos)
 * @property lastUpdated - Last time charter was updated
 */
export interface CharterPerformance {
  id: string;
  name: string;
  isActive: boolean;
  rating: number | null;
  bookingCount: number;
  mediaCount: number;
  lastUpdated: Date;
}

/**
 * Get performance metrics for all charters owned by a captain
 *
 * Aggregates charter data with booking statistics and media counts.
 * Used for dashboard overview to show captain which charters are performing well.
 *
 * Data sources:
 * - Captain DB: Charter (basic info, rating, media count)
 * - Market DB: Booking (booking count aggregation for PAID/COMPLETED)
 *
 * @param captainId - Captain's user ID (maps to Charter.ownerId)
 * @returns Array of charters with performance metrics
 *
 * @example
 * const charters = await getCharterPerformance("captain-123");
 * charters.forEach(c => {
 *   console.log(`${c.name}: ${c.bookingCount} bookings, ${c.mediaCount} media`);
 * });
 */
export async function getCharterPerformance(
  captainId: string
): Promise<CharterPerformance[]> {
  // Fetch all charters for this captain with media count
  const charters = await prisma.charter.findMany({
    where: { ownerId: captainId },
    select: {
      id: true,
      name: true,
      isActive: true,
      updatedAt: true,
      _count: {
        select: {
          media: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (charters.length === 0) {
    return [];
  }

  const charterIds = charters.map((c) => c.id);

  // Fetch booking counts for PAID and COMPLETED bookings
  const bookingCounts = await prismaMarket.booking.groupBy({
    by: ["charterId"],
    where: {
      charterId: { in: charterIds },
      status: { in: ["PAID", "COMPLETED"] },
    },
    _count: {
      id: true,
    },
  });

  // Build lookup map for booking counts
  const bookingCountMap = new Map(
    bookingCounts.map((bc: { charterId: string; _count: { id: number } }) => [
      bc.charterId,
      bc._count.id,
    ])
  );

  // Transform to performance format
  return charters.map((charter) => ({
    id: charter.id,
    name: charter.name,
    isActive: charter.isActive,
    rating: null, // Rating would come from reviews in market DB
    bookingCount: (bookingCountMap.get(charter.id) || 0) as number,
    mediaCount: charter._count.media,
    lastUpdated: charter.updatedAt,
  }));
}
