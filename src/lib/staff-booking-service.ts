import type { EnrichedMarketBooking, MarketBooking } from "./enrich-booking";
import { enrichBookings } from "./enrich-booking";
import { isMarketDbConfigured, prismaMarket } from "./prisma-market";

/**
 * Staff Booking Service
 *
 * Provides booking data access for staff/admin with extended filtering
 * and search capabilities beyond captain-specific views.
 */

// Generic where input type for market DB queries
// Using 'any' because market DB client is dynamically loaded without types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarketBookingWhereInput = Record<string, any>;

// Type for analytics booking data
type AnalyticsBooking = {
  status: string;
  bookingFlowType: "MANUAL" | "AUTO";
  paymentMethod: string | null;
  finalPrice: unknown; // Decimal from DB
  createdAt: Date;
  date: Date;
};

export type BookingFilters = {
  status?: MarketBooking["status"];
  flowType?: "MANUAL" | "AUTO";
  dateFrom?: Date;
  dateTo?: Date;
  charterId?: string;
  paymentMethod?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type BookingPagination = {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type BookingsWithPagination = {
  bookings: EnrichedMarketBooking[];
  pagination: BookingPagination;
};

const ITEMS_PER_PAGE = 20;

/**
 * Fetch all bookings with filters and pagination (staff view)
 */
export async function fetchStaffBookings(
  filters: BookingFilters
): Promise<MarketBooking[]> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  const where: MarketBookingWhereInput = {};

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Flow type filter
  if (filters.flowType) {
    where.bookingFlowType = filters.flowType;
  }

  // Date range filter
  if (filters.dateFrom) {
    where.date = { ...where.date, gte: filters.dateFrom };
  }
  if (filters.dateTo) {
    where.date = { ...where.date, lte: filters.dateTo };
  }

  // Charter filter
  if (filters.charterId) {
    where.charterId = filters.charterId;
  }

  // Payment method filter
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  // Search filter (booking ID, guest name, user email)
  if (filters.search) {
    where.OR = [
      // Exact match for booking ID
      { id: { contains: filters.search, mode: "insensitive" } },
      // Search in user email
      {
        user: {
          email: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  try {
    const bookings = await prismaMarket.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit || ITEMS_PER_PAGE,
      skip: filters.offset || 0,
    });

    // Convert Decimal to number and cast JSON fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return bookings.map((b: any) => ({
      ...b,
      tripPrice: Number(b.tripPrice),
      finalPrice: Number(b.finalPrice),
      platformFee: b.platformFee ? Number(b.platformFee) : null,
      serviceFee: b.serviceFee ? Number(b.serviceFee) : null,
      captainEarnings: b.captainEarnings ? Number(b.captainEarnings) : null,
      refundAmount: b.refundAmount ? Number(b.refundAmount) : null,
      guests: b.guests as MarketBooking["guests"],
      timeSlots: b.timeSlots as MarketBooking["timeSlots"],
    })) as MarketBooking[];
  } catch (error) {
    console.error("Error fetching staff bookings from Market DB:", error);
    throw new Error(
      "Failed to fetch bookings. Please check Market DB connection."
    );
  }
}

/**
 * Count bookings with filters
 */
export async function countStaffBookings(
  filters: BookingFilters
): Promise<number> {
  if (!isMarketDbConfigured()) {
    throw new Error(
      "MARKET_DATABASE_URL not configured. Cannot read bookings from Market DB."
    );
  }

  const where: MarketBookingWhereInput = {};

  // Status filter
  if (filters.status) {
    where.status = filters.status;
  }

  // Flow type filter
  if (filters.flowType) {
    where.bookingFlowType = filters.flowType;
  }

  // Date range filter
  if (filters.dateFrom) {
    where.date = { ...where.date, gte: filters.dateFrom };
  }
  if (filters.dateTo) {
    where.date = { ...where.date, lte: filters.dateTo };
  }

  // Charter filter
  if (filters.charterId) {
    where.charterId = filters.charterId;
  }

  // Payment method filter
  if (filters.paymentMethod) {
    where.paymentMethod = filters.paymentMethod;
  }

  // Search filter
  if (filters.search) {
    where.OR = [
      { id: { contains: filters.search, mode: "insensitive" } },
      {
        user: {
          email: { contains: filters.search, mode: "insensitive" },
        },
      },
    ];
  }

  try {
    return await prismaMarket.booking.count({ where });
  } catch (error) {
    console.error("Error counting staff bookings from Market DB:", error);
    throw new Error(
      "Failed to count bookings. Please check Market DB connection."
    );
  }
}

/**
 * Fetch bookings with pagination (staff view)
 */
export async function getStaffBookingsWithPagination(
  filters: BookingFilters,
  page: number
): Promise<BookingsWithPagination> {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const [bookings, totalCount] = await Promise.all([
    fetchStaffBookings({ ...filters, limit: ITEMS_PER_PAGE, offset }),
    countStaffBookings(filters),
  ]);

  const enrichedBookings = await enrichBookings(bookings);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return {
    bookings: enrichedBookings,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get booking statistics for staff dashboard
 */
export async function getStaffBookingStats(): Promise<{
  total: number;
  pending: number;
  revenue: number;
  completionRate: number;
}> {
  if (!isMarketDbConfigured()) {
    return { total: 0, pending: 0, revenue: 0, completionRate: 0 };
  }

  try {
    const [total, pending, completed, paidBookings] = await Promise.all([
      prismaMarket.booking.count(),
      prismaMarket.booking.count({
        where: {
          OR: [{ status: "PENDING" }, { status: "PAYMENT_AUTHORIZED" }],
        },
      }),
      prismaMarket.booking.count({ where: { status: "COMPLETED" } }),
      prismaMarket.booking.findMany({
        where: {
          status: { in: ["PAID", "COMPLETED"] },
        },
        select: { finalPrice: true },
      }),
    ]);

    const revenue = paidBookings.reduce(
      (sum: number, booking: { finalPrice: unknown }) =>
        sum + Number(booking.finalPrice),
      0
    );

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      pending,
      revenue,
      completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
    };
  } catch (error) {
    console.error("Error fetching staff booking stats:", error);
    return { total: 0, pending: 0, revenue: 0, completionRate: 0 };
  }
}

/**
 * Get monthly booking statistics
 */
export async function getMonthlyBookingStats(): Promise<{
  totalBookings: number;
  revenue: number;
}> {
  if (!isMarketDbConfigured()) {
    return { totalBookings: 0, revenue: 0 };
  }

  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const bookings = await prismaMarket.booking.findMany({
      where: {
        createdAt: { gte: firstDayOfMonth },
        status: { in: ["PAID", "COMPLETED"] },
      },
      select: { finalPrice: true },
    });

    const revenue = bookings.reduce(
      (sum: number, booking: { finalPrice: unknown }) =>
        sum + Number(booking.finalPrice),
      0
    );

    return {
      totalBookings: bookings.length,
      revenue,
    };
  } catch (error) {
    console.error("Error fetching monthly booking stats:", error);
    return { totalBookings: 0, revenue: 0 };
  }
}

/**
 * Get analytics data for charts and dashboard
 */
export async function getBookingAnalytics(): Promise<{
  statusDistribution: { status: string; count: number }[];
  flowTypeDistribution: { flowType: string; count: number }[];
  paymentMethodDistribution: {
    method: string;
    count: number;
    amount: number;
  }[];
  bookingsOverTime: { date: string; count: number; revenue: number }[];
  tripsOverTime: { date: string; count: number; revenue: number }[];
  urgentActions: {
    expiringApprovals: number;
    paymentDeadlines: number;
    acknowledgmentPending: number;
    underReview: number;
  };
}> {
  if (!isMarketDbConfigured()) {
    return {
      statusDistribution: [],
      flowTypeDistribution: [],
      paymentMethodDistribution: [],
      bookingsOverTime: [],
      tripsOverTime: [],
      urgentActions: {
        expiringApprovals: 0,
        paymentDeadlines: 0,
        acknowledgmentPending: 0,
        underReview: 0,
      },
    };
  }

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const twentyFourHoursFromNow = new Date(now);
    twentyFourHoursFromNow.setHours(now.getHours() + 24);

    // Fetch all required data in parallel
    const [
      allBookingsRaw,
      expiringApprovals,
      paymentDeadlines,
      acknowledgmentPending,
      underReview,
    ] = await Promise.all([
      // All bookings for distribution analysis
      prismaMarket.booking.findMany({
        select: {
          status: true,
          bookingFlowType: true,
          paymentMethod: true,
          finalPrice: true,
          createdAt: true,
          date: true,
        },
      }) as Promise<AnalyticsBooking[]>,
      // Expiring approvals (PENDING bookings expiring within 24h)
      prismaMarket.booking.count({
        where: {
          status: "PENDING",
          expiresAt: { lte: twentyFourHoursFromNow },
        },
      }),
      // Payment deadlines (AWAITING_PAYMENT with deadline within 24h)
      prismaMarket.booking.count({
        where: {
          status: "AWAITING_PAYMENT",
          paymentDeadline: { lte: twentyFourHoursFromNow },
        },
      }),
      // Acknowledgment pending (PAYMENT_AUTHORIZED)
      prismaMarket.booking.count({
        where: { status: "PAYMENT_AUTHORIZED" },
      }),
      // Under review
      prismaMarket.booking.count({
        where: { status: "UNDER_REVIEW" },
      }),
    ]);

    // Type the bookings properly
    const allBookings: AnalyticsBooking[] = allBookingsRaw;

    // Calculate status distribution
    const statusCounts = new Map<string, number>();
    allBookings.forEach((b) => {
      statusCounts.set(b.status, (statusCounts.get(b.status) || 0) + 1);
    });
    const statusDistribution = Array.from(statusCounts.entries()).map(
      ([status, count]) => ({ status, count })
    );

    // Calculate flow type distribution
    const flowTypeCounts = new Map<string, number>();
    allBookings.forEach((b) => {
      flowTypeCounts.set(
        b.bookingFlowType,
        (flowTypeCounts.get(b.bookingFlowType) || 0) + 1
      );
    });
    const flowTypeDistribution = Array.from(flowTypeCounts.entries()).map(
      ([flowType, count]) => ({ flowType, count })
    );

    // Calculate payment method distribution
    const paymentMethodData = new Map<
      string,
      { count: number; amount: number }
    >();
    allBookings
      .filter((b) => b.paymentMethod)
      .forEach((b) => {
        const method = b.paymentMethod || "Unknown";
        const existing = paymentMethodData.get(method) || {
          count: 0,
          amount: 0,
        };
        paymentMethodData.set(method, {
          count: existing.count + 1,
          amount: existing.amount + Number(b.finalPrice),
        });
      });
    const paymentMethodDistribution = Array.from(
      paymentMethodData.entries()
    ).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount,
    }));
    // Calculate bookings over time (last 30 days)
    const dateData = new Map<string, { count: number; revenue: number }>();
    const tripDateData = new Map<string, { count: number; revenue: number }>();

    allBookings.forEach((b) => {
      // 1. Bookings Created Over Time (createdAt)
      if (b.createdAt >= thirtyDaysAgo) {
        // Use Malaysia time for date grouping to ensure accuracy
        const dateStr = b.createdAt.toLocaleDateString("en-CA", {
          timeZone: "Asia/Kuala_Lumpur",
        });
        const existing = dateData.get(dateStr) || { count: 0, revenue: 0 };
        dateData.set(dateStr, {
          count: existing.count + 1,
          revenue:
            existing.revenue +
            (["PAID", "COMPLETED"].includes(b.status)
              ? Number(b.finalPrice)
              : 0),
        });
      }

      // 2. Trips Scheduled Over Time (date)
      // We want to see trips scheduled in the same window (last 30 days)
      // Or maybe upcoming? Let's stick to the same window for now to compare "what was sold" vs "what happened"
      if (b.date >= thirtyDaysAgo && b.date <= now) {
        const tripDateStr = b.date.toLocaleDateString("en-CA", {
          timeZone: "Asia/Kuala_Lumpur",
        });
        const existingTrip = tripDateData.get(tripDateStr) || {
          count: 0,
          revenue: 0,
        };
        tripDateData.set(tripDateStr, {
          count: existingTrip.count + 1,
          revenue:
            existingTrip.revenue +
            (["PAID", "COMPLETED"].includes(b.status)
              ? Number(b.finalPrice)
              : 0),
        });
      }
    });

    // Sort by date and fill in missing days
    const bookingsOverTime: { date: string; count: number; revenue: number }[] =
      [];
    const tripsOverTime: { date: string; count: number; revenue: number }[] =
      [];

    for (
      let d = new Date(thirtyDaysAgo);
      d <= now;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toLocaleDateString("en-CA", {
        timeZone: "Asia/Kuala_Lumpur",
      });

      // Bookings Created
      const data = dateData.get(dateStr) || { count: 0, revenue: 0 };
      bookingsOverTime.push({
        date: dateStr,
        count: data.count,
        revenue: data.revenue,
      });

      // Trips Scheduled
      const tripData = tripDateData.get(dateStr) || { count: 0, revenue: 0 };
      tripsOverTime.push({
        date: dateStr,
        count: tripData.count,
        revenue: tripData.revenue,
      });
    }

    return {
      statusDistribution,
      flowTypeDistribution,
      paymentMethodDistribution,
      bookingsOverTime,
      tripsOverTime,
      urgentActions: {
        expiringApprovals,
        paymentDeadlines,
        acknowledgmentPending,
        underReview,
      },
    };
  } catch (error) {
    console.error("Error fetching booking analytics:", error);
    return {
      statusDistribution: [],
      flowTypeDistribution: [],
      paymentMethodDistribution: [],
      bookingsOverTime: [],
      tripsOverTime: [],
      urgentActions: {
        expiringApprovals: 0,
        paymentDeadlines: 0,
        acknowledgmentPending: 0,
        underReview: 0,
      },
    };
  }
}
