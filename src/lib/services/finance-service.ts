import { decrypt } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";

export type TimePeriod = "7d" | "30d" | "90d" | "1y" | "all";

/**
 * Dashboard earnings summary with period comparison
 *
 * @property currentPeriod - Captain earnings in the selected period
 * @property previousPeriod - Captain earnings in the comparison period
 * @property percentChange - Percentage change from previous to current period
 * @property pending - Pending payouts awaiting processing
 * @property nextPayoutDate - Estimated next payout date if pending > 0
 * @property commissionRate - Captain's commission rate based on pricing plan
 */
export interface EarningsSummary {
  currentPeriod: number;
  previousPeriod: number;
  percentChange: number;
  pending: number;
  nextPayoutDate: Date | null;
  commissionRate: number;
}

export interface RevenueStats {
  totalRevenue: number; // Gross sales before discount (finalPrice + discountAmount)
  platformRevenue: number; // Fishon's net revenue: tripIncome + serviceIncome - discount
  tripIncome: number; // 10% commission from trip price (platformFee)
  serviceIncome: number; // 0.5% of amount (Fishon's portion of 2% service fee)
  captainRevenue: number; // Sum of captainEarnings
  totalDiscount: number; // Total discount given (absorbed by Fishon)
  paymentGatewayFee: number; // 1.5% payment gateway fee (SenangPay)
  totalTax: number; // Total tax collected (held for government)
  bookingCount: number; // Count of PAID bookings
  avgBookingValue: number; // Average finalPrice
  refundsIssued: number; // Sum of refundAmount
  pendingPayouts: number; // Sum where payoutStatus=PENDING
}

export interface RevenueComparison {
  current: RevenueStats;
  previous: RevenueStats;
  changes: {
    totalRevenue: number; // Percentage change
    platformRevenue: number;
    bookingCount: number;
    avgBookingValue: number;
  };
}

export interface DailyRevenue {
  date: string; // YYYY-MM-DD format
  totalRevenue: number;
  platformRevenue: number; // tripIncome + serviceIncome - discount
  tripIncome: number; // 10% commission (platformFee)
  serviceIncome: number; // 0.5% service (Fishon's portion)
  bookingCount: number;
}

export interface BookingFinancial {
  id: string;
  charterId: string;
  charterName: string;
  tripId: string;
  tripName: string;
  ownerId: string;
  ownerName: string;
  anglerName: string;
  tripDate: Date;
  finalPrice: number;
  // Financial breakdown
  platformFee: number; // 10% commission (tripIncome)
  serviceFee: number; // 2% total service fee
  tripIncome: number; // Same as platformFee (10% commission)
  serviceIncome: number; // 0.5% Fishon's portion of service fee
  paymentGatewayFee: number; // 1.5% SenangPay fee
  discountAmount: number; // Discount amount (absorbed by Fishon)
  taxAmount: number; // Tax amount (held for govt)
  captainEarnings: number;
  paymentMethod: string | null;
  paymentTransactionId: string | null;
  paidAt: Date | null;
  payoutStatus: string | null;
  refundAmount: number | null;
  createdAt: Date;
  status: string;
}

/**
 * Get revenue statistics for a specific date range
 * @param dateField - Which date field to filter by (default: paidAt for finance reports)
 */
export async function getRevenueStatsByDateRange(
  startDate: Date,
  endDate: Date,
  dateField: BookingDateField = "paidAt"
): Promise<RevenueStats> {
  // Build where clause with dynamic date field
  // Include both PAID and COMPLETED bookings (COMPLETED = trip finished but still a paid booking)
  // For payment date filtering, also check paymentCapturedAt (AUTO DIRECT flow)
  const dateFilter = buildDateFilter(dateField, startDate, endDate);
  const where: Record<string, unknown> = {
    status: { in: ["PAID", "COMPLETED"] },
    ...dateFilter,
  };

  // Fetch all PAID bookings with financial fields for the period
  const bookings = await prismaMarket.booking.findMany({
    where,
    select: {
      finalPrice: true,
      platformFee: true,
      captainEarnings: true,
      serviceFee: true,
      discount: true,
      tax: true,
      refundAmount: true,
      payoutStatus: true,
    },
  });

  type BookingFinancial = (typeof bookings)[0];

  // Calculate revenue metrics
  // Total revenue = gross sales (finalPrice + discount amount)
  // This represents what anglers would pay without any discounts
  const totalRevenue = bookings.reduce((sum: number, b: BookingFinancial) => {
    const finalPrice = Number(b.finalPrice || 0);
    const discountAmount =
      b.discount && typeof b.discount === "object"
        ? (b.discount as { amount?: number }).amount || 0
        : 0;
    return sum + finalPrice + discountAmount;
  }, 0);
  const bookingCount = bookings.length;
  const avgBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0;

  // Calculate Fishon's net revenue: platformFee - discount
  // Per FINANCIAL_CALCULATION_SYSTEM.md: Discount is absorbed by Fishon from platform fee
  const platformRevenue = bookings.reduce(
    (sum: number, b: BookingFinancial) => {
      const platformFee = Number(b.platformFee || 0);
      const discountAmount =
        b.discount && typeof b.discount === "object"
          ? (b.discount as { amount?: number }).amount || 0
          : 0;
      return sum + (platformFee - discountAmount);
    },
    0
  );

  // Calculate total discount given
  const totalDiscount = bookings.reduce((sum: number, b: BookingFinancial) => {
    if (b.discount && typeof b.discount === "object") {
      const discount = b.discount as { amount?: number };
      return sum + (discount.amount || 0);
    }
    return sum;
  }, 0);

  // Calculate total service fee (2% total)
  const totalServiceFee = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.serviceFee || 0),
    0
  );

  // Calculate Fishon's service income (0.5% = 25% of 2% service fee)
  const serviceIncome = Math.round(totalServiceFee * 0.25 * 100) / 100;

  // Calculate payment gateway fee (1.5% = 75% of 2% service fee)
  const paymentGatewayFee = Math.round(totalServiceFee * 0.75 * 100) / 100;

  // Calculate trip income (sum of platformFee before discount)
  const tripIncome = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.platformFee || 0),
    0
  );

  // Calculate total tax collected (future: held for government)
  const totalTax = bookings.reduce((sum: number, b: BookingFinancial) => {
    if (b.tax && typeof b.tax === "object") {
      const tax = b.tax as { amount?: number };
      return sum + (tax.amount || 0);
    }
    return sum;
  }, 0);

  const captainRevenue = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.captainEarnings || 0),
    0
  );

  const refundsIssued = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.refundAmount || 0),
    0
  );

  const pendingPayouts = bookings
    .filter((b: BookingFinancial) => b.payoutStatus === "PENDING")
    .reduce(
      (sum: number, b: BookingFinancial) =>
        sum + Number(b.captainEarnings || 0),
      0
    );

  return {
    totalRevenue,
    platformRevenue: tripIncome + serviceIncome - totalDiscount, // Net Fishon revenue
    tripIncome, // 10% commission (before discount)
    serviceIncome, // 0.5% service fee (Fishon's portion)
    captainRevenue,
    totalDiscount,
    paymentGatewayFee, // 1.5% SenangPay fee
    totalTax,
    bookingCount,
    avgBookingValue,
    refundsIssued,
    pendingPayouts,
  };
}

/**
 * Get revenue statistics for a given time period (legacy wrapper)
 */
export async function getRevenueStats(
  period: TimePeriod
): Promise<RevenueStats> {
  const { startDate, endDate } = getPeriodBoundaries(period);
  return getRevenueStatsByDateRange(startDate, endDate);
}

/**
 * Get revenue stats with comparison to previous period
 * @param dateField - Which date field to filter by (default: paidAt for finance reports)
 */
export async function getRevenueComparison(
  startDate: Date,
  endDate: Date,
  dateField: BookingDateField = "paidAt"
): Promise<RevenueComparison> {
  // Calculate current period stats
  const current = await getRevenueStatsByDateRange(
    startDate,
    endDate,
    dateField
  );

  // Calculate previous period (same duration before startDate)
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - periodDuration);

  const previous = await getRevenueStatsByDateRange(
    previousStart,
    previousEnd,
    dateField
  );

  // Calculate percentage changes
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    current,
    previous,
    changes: {
      totalRevenue: calculateChange(
        current.totalRevenue,
        previous.totalRevenue
      ),
      platformRevenue: calculateChange(
        current.platformRevenue,
        previous.platformRevenue
      ),
      bookingCount: calculateChange(
        current.bookingCount,
        previous.bookingCount
      ),
      avgBookingValue: calculateChange(
        current.avgBookingValue,
        previous.avgBookingValue
      ),
    },
  };
}

/**
 * Get daily revenue breakdown for chart visualization
 * @param dateField - Which date field to filter by (default: paidAt for finance reports)
 */
export async function getDailyRevenue(
  startDate: Date,
  endDate: Date,
  dateField: BookingDateField = "paidAt"
): Promise<DailyRevenue[]> {
  // Build where clause with dynamic date field
  // Include both PAID and COMPLETED bookings (COMPLETED = trip finished but still a paid booking)
  // For payment date filtering, also check paymentCapturedAt (AUTO DIRECT flow)
  const dateFilter = buildDateFilter(dateField, startDate, endDate);
  const where: Record<string, unknown> = {
    status: { in: ["PAID", "COMPLETED"] },
    ...dateFilter,
  };

  const bookings = await prismaMarket.booking.findMany({
    where,
    select: {
      finalPrice: true,
      platformFee: true,
      serviceFee: true,
      discount: true,
      paidAt: true,
      paymentAuthorizedAt: true, // Include for AUTO flow
      date: true,
      createdAt: true,
    },
  });

  // Group bookings by the selected date field
  const dailyMap = new Map<string, DailyRevenue>();

  for (const booking of bookings) {
    // Get the date value based on the selected field
    // For "paidAt" field, also check paymentAuthorizedAt (AUTO flow)
    let dateValue: Date | null = null;
    if (dateField === "paidAt") {
      dateValue = booking.paidAt || booking.paymentAuthorizedAt || null;
    } else {
      dateValue = booking[dateField] as Date | null;
    }
    if (!dateValue) continue; // Skip if date field is null

    const dateKey = new Date(dateValue).toISOString().split("T")[0]; // YYYY-MM-DD

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        totalRevenue: 0,
        platformRevenue: 0,
        tripIncome: 0,
        serviceIncome: 0,
        bookingCount: 0,
      });
    }

    const day = dailyMap.get(dateKey)!;
    day.bookingCount += 1;

    // Calculate trip income (10% commission = platformFee)
    const platformFee = Number(booking.platformFee || 0);
    day.tripIncome += platformFee;

    // Calculate service income (0.5% = 25% of 2% serviceFee)
    const serviceFee = Number(booking.serviceFee || 0);
    day.serviceIncome += serviceFee * 0.25;

    // Calculate discount
    const discountAmount =
      booking.discount && typeof booking.discount === "object"
        ? (booking.discount as { amount?: number }).amount || 0
        : 0;

    // Total revenue = gross sales (finalPrice + discount)
    day.totalRevenue += Number(booking.finalPrice) + discountAmount;

    // Platform revenue = tripIncome + serviceIncome - discount
    day.platformRevenue += platformFee + serviceFee * 0.25 - discountAmount;
  }

  // Fill in missing dates with zero values
  const result: DailyRevenue[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split("T")[0];
    result.push(
      dailyMap.get(dateKey) || {
        date: dateKey,
        totalRevenue: 0,
        platformRevenue: 0,
        tripIncome: 0,
        serviceIncome: 0,
        bookingCount: 0,
      }
    );
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return result;
}

/**
 * Date field options for filtering bookings
 * - paidAt: When payment was received (best for finance reports)
 * - date: When the trip is scheduled (best for operations)
 * - createdAt: When booking was created (best for activity analysis)
 */
export type BookingDateField = "paidAt" | "date" | "createdAt";

/**
 * Build date filter for Prisma where clause
 * When filtering by payment date ("paidAt"), we need to check both:
 * - paidAt: Used by MANUAL booking flow (captain approves → angler pays via /api/bookings/pay)
 * - paymentAuthorizedAt: Used by AUTO flow (instant booking via /api/payment/senangpay-callback)
 *
 * This ensures we capture all paid bookings regardless of which booking flow was used.
 */
function buildDateFilter(
  dateField: BookingDateField,
  startDate: Date,
  endDate: Date
): Record<string, unknown> {
  if (dateField === "paidAt") {
    // For payment date filtering, check both paidAt (MANUAL) and paymentAuthorizedAt (AUTO)
    return {
      OR: [
        { paidAt: { gte: startDate, lte: endDate } },
        { paymentAuthorizedAt: { gte: startDate, lte: endDate } },
      ],
    };
  }
  // For other date fields (date, createdAt), use direct field filter
  return {
    [dateField]: { gte: startDate, lte: endDate },
  };
}

/**
 * Get bookings with financial data for admin dashboard
 */
export async function getBookingsFinancial(filters?: {
  status?: string | string[];
  payoutStatus?: string;
  ownerId?: string;
  startDate?: Date;
  endDate?: Date;
  dateField?: BookingDateField;
  search?: string;
  limit?: number;
}): Promise<BookingFinancial[]> {
  // Build where clause
  // Using any type since Booking is from market DB schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters?.status) {
    // Support both single status string and array of statuses
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status as string;
    }
  }

  if (filters?.payoutStatus) {
    where.payoutStatus = filters.payoutStatus as string;
  }

  // Use specified date field or default to paidAt for finance reports
  // For payment date filtering, also check paymentCapturedAt (AUTO DIRECT flow)
  const dateField = filters?.dateField || "paidAt";
  if (filters?.startDate && filters?.endDate) {
    const dateFilter = buildDateFilter(
      dateField,
      filters.startDate,
      filters.endDate
    );
    Object.assign(where, dateFilter);
  } else if (filters?.startDate || filters?.endDate) {
    // Handle partial date filters (only start or only end)
    if (dateField === "paidAt") {
      // For payment date, use OR condition with both fields (paidAt for MANUAL, paymentAuthorizedAt for AUTO)
      const orConditions = [];
      const paidAtFilter: Record<string, Date> = {};
      const authorizedAtFilter: Record<string, Date> = {};
      if (filters?.startDate) {
        paidAtFilter.gte = filters.startDate;
        authorizedAtFilter.gte = filters.startDate;
      }
      if (filters?.endDate) {
        paidAtFilter.lte = filters.endDate;
        authorizedAtFilter.lte = filters.endDate;
      }
      orConditions.push({ paidAt: paidAtFilter });
      orConditions.push({ paymentAuthorizedAt: authorizedAtFilter });
      where.OR = orConditions;
    } else {
      where[dateField] = {};
      if (filters?.startDate) where[dateField].gte = filters.startDate;
      if (filters?.endDate) where[dateField].lte = filters.endDate;
    }
  }

  // Fetch bookings from market DB
  const bookings = await prismaMarket.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  });

  // Extract unique charterIds, tripIds, and userIds
  const charterIds = [
    ...new Set((bookings as BookingRaw[]).map((b: BookingRaw) => b.charterId)),
  ] as string[];
  const tripIds = [
    ...new Set((bookings as BookingRaw[]).map((b: BookingRaw) => b.tripId)),
  ] as string[];
  const userIds = [
    ...new Set(
      (bookings as BookingRaw[])
        .map((b: BookingRaw) => b.userId)
        .filter(Boolean) as string[]
    ),
  ];

  // Fetch charter data from captain DB
  const chartersRaw = await prisma.charter.findMany({
    where: { id: { in: charterIds } },
    select: {
      id: true,
      name: true,
      ownerId: true,
      captain: {
        select: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  // Fetch trip data from captain DB
  const tripsRaw = await prisma.trip.findMany({
    where: { id: { in: tripIds } },
    select: { id: true, name: true },
  });

  // Map to CharterInfo with ownerId as string
  const charters = chartersRaw.map((c) => ({
    id: c.id,
    name: c.name,
    ownerId: c.ownerId ?? "",
    captain: c.captain,
  }));

  // Fetch angler data from market DB
  const anglers = await prismaMarket.marketUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  // Build lookup maps
  const charterMap = new Map(charters.map((c) => [c.id, c]));
  const tripMap = new Map(tripsRaw.map((t) => [t.id, t]));
  const anglerMap = new Map(
    anglers.map((a: { id: string; name: string; email: string }) => [a.id, a])
  );

  // Enrich bookings
  interface CharterInfo {
    id: string;
    name: string;
    ownerId: string;
    captain?: {
      user?: {
        name?: string | null;
        email?: string;
      };
    };
  }

  interface AnglerInfo {
    id: string;
    name: string;
    email: string;
  }

  interface BookingRaw {
    id: string;
    charterId: string;
    tripId: string;
    userId?: string | null;
    guestFirstName?: string | null;
    guestLastName?: string | null;
    date: Date;
    finalPrice: number;
    platformFee?: number | null;
    serviceFee?: number | null;
    discount?: { amount?: number; code?: string; percentage?: string } | null;
    tax?: { amount?: number; name?: string; percentage?: string } | null;
    captainEarnings?: number | null;
    paymentMethod?: string | null;
    paymentTransactionId?: string | null;
    paidAt?: Date | null;
    payoutStatus?: string | null;
    refundAmount?: number | null;
    createdAt: Date;
    status: string;
  }

  const enriched: BookingFinancial[] = (bookings as BookingRaw[]).map(
    (booking: BookingRaw) => {
      const charter: CharterInfo | undefined = charterMap.get(
        booking.charterId
      );
      const trip = tripMap.get(booking.tripId);
      const angler: AnglerInfo | undefined = booking.userId
        ? (anglerMap.get(booking.userId) as AnglerInfo | undefined)
        : undefined;

      // Extract financial values
      const platformFee = Number(booking.platformFee || 0);
      const serviceFee = Number(booking.serviceFee || 0);
      const discountAmount =
        booking.discount && typeof booking.discount === "object"
          ? Number(booking.discount.amount || 0)
          : 0;
      const taxAmount =
        booking.tax && typeof booking.tax === "object"
          ? Number(booking.tax.amount || 0)
          : 0;

      // Calculate income breakdown (per FINANCIAL_CALCULATION_SYSTEM.md)
      // tripIncome = platformFee (10% commission)
      // serviceIncome = 0.5% (25% of 2% service fee)
      // paymentGatewayFee = 1.5% (75% of 2% service fee)
      const tripIncome = platformFee;
      const serviceIncome = Math.round(serviceFee * 0.25 * 100) / 100;
      const paymentGatewayFee = Math.round(serviceFee * 0.75 * 100) / 100;

      return {
        id: booking.id,
        charterId: booking.charterId,
        charterName: charter?.name || "Unknown Charter",
        tripId: booking.tripId,
        tripName: trip?.name || "Unknown Trip",
        ownerId: charter?.ownerId || "",
        ownerName: charter?.captain?.user?.name || "Unknown Owner",
        anglerName:
          (angler?.name as string | undefined) ||
          (booking.guestFirstName
            ? `${booking.guestFirstName} ${booking.guestLastName}`.trim()
            : "Guest"),
        tripDate: booking.date,
        finalPrice: Number(booking.finalPrice),
        // Financial breakdown
        platformFee,
        serviceFee,
        tripIncome,
        serviceIncome,
        paymentGatewayFee,
        discountAmount,
        taxAmount,
        captainEarnings: Number(booking.captainEarnings || 0),
        paymentMethod: booking.paymentMethod ?? null,
        paymentTransactionId: booking.paymentTransactionId ?? null,
        paidAt: booking.paidAt ?? null,
        payoutStatus: booking.payoutStatus ?? null,
        refundAmount: booking.refundAmount
          ? Number(booking.refundAmount)
          : null,
        createdAt: booking.createdAt,
        status: booking.status,
      };
    }
  );

  // Filter by ownerId if specified (after enrichment)
  if (filters?.ownerId) {
    return enriched.filter(
      (b: BookingFinancial) => b.ownerId === filters.ownerId
    );
  }

  // Filter by search query (charter name or angler name)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    return enriched.filter(
      (b: BookingFinancial) =>
        b.charterName.toLowerCase().includes(searchLower) ||
        b.anglerName.toLowerCase().includes(searchLower)
    );
  }

  return enriched;
}

/**
 * Calculate platform fee and captain earnings based on pricing plan
 */
export async function calculateFinancials(booking: {
  finalPrice: number;
  charterId: string;
}): Promise<{ platformFee: number; captainEarnings: number }> {
  // Fetch charter pricing plan
  const charter = await prisma.charter.findUnique({
    where: { id: booking.charterId },
    select: { pricingPlan: true },
  });

  // Commission rates by plan
  const commissionRate =
    charter?.pricingPlan === "GOLD"
      ? 0.05
      : charter?.pricingPlan === "SILVER"
        ? 0.08
        : 0.1; // BASIC

  const platformFee =
    Math.round(booking.finalPrice * commissionRate * 100) / 100;
  const captainEarnings = booking.finalPrice - platformFee;

  return { platformFee, captainEarnings };
}

/**
 * Helper function to get date filter for time period
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPeriodFilter(period: TimePeriod): any {
  if (period === "all") return undefined;

  const now = new Date();
  const days =
    period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return { gte: startDate };
}

/**
 * =======================================
 * PAYOUT MANAGEMENT (Phase 2)
 * =======================================
 */

export interface PayoutCalculation {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  totalEarnings: number;
  bookingCount: number;
  bookingIds: string[];
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  // New fields for eligibility tracking
  eligibleEarnings: number; // Earnings from bookings past eligibility window
  eligibleBookingCount: number;
  eligibleBookingIds: string[];
  oldestTripDate: Date | null; // Earliest trip date in pending bookings
  newestEligibleDate: Date | null; // Most recent eligible booking date
}

/**
 * Calculate payout eligibility date (3 business days after trip)
 * @param tripDate - The date the trip was completed
 * @returns Date when payout becomes eligible
 */
export function getPayoutEligibleDate(tripDate: Date): Date {
  const date = new Date(tripDate);
  let businessDays = 0;
  while (businessDays < 3) {
    date.setDate(date.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      businessDays++;
    }
  }
  return date;
}

/**
 * Check if a booking is eligible for payout
 * @param tripDate - The date the trip was completed
 * @returns true if 3+ business days have passed since trip
 */
export function isPayoutEligible(tripDate: Date): boolean {
  const eligibleDate = getPayoutEligibleDate(tripDate);
  return new Date() >= eligibleDate;
}

/**
 * Calculate pending payouts for all captains with COMPLETED bookings
 *
 * Startup Phase Policy:
 * - Only COMPLETED bookings are eligible (trip finished)
 * - Payout eligibility: 3 business days after trip date
 * - Manual weekly processing by admin
 */
export async function calculatePendingPayouts(): Promise<PayoutCalculation[]> {
  // Fetch all COMPLETED bookings with PENDING payout status
  // Changed from PAID to COMPLETED - payout only after trip is done
  const bookings = await prismaMarket.booking.findMany({
    where: {
      status: "COMPLETED",
      payoutStatus: "PENDING",
      captainEarnings: { not: null },
    },
    select: {
      id: true,
      charterId: true,
      captainEarnings: true,
      date: true, // Trip date for eligibility calculation
    },
  });

  if (bookings.length === 0) return [];

  type PendingBooking = (typeof bookings)[0];

  // Extract unique charter IDs
  const charterIds = [
    ...new Set(bookings.map((b: PendingBooking) => b.charterId)),
  ] as string[];

  // Fetch charter owners from captain DB
  const charters = await prisma.charter.findMany({
    where: { id: { in: charterIds } },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          verification: {
            select: {
              bankName: true,
              bankAccountNumber: true,
              bankAccountHolder: true,
            },
          },
        },
      },
    },
  });

  // Build owner lookup
  const ownerMap = new Map(charters.map((c) => [c.id, c.owner]));

  // Group bookings by owner
  const ownerBookings = new Map<string, PendingBooking[]>();

  for (const booking of bookings) {
    const owner = ownerMap.get(booking.charterId);
    if (!owner) continue;

    if (!ownerBookings.has(owner.id)) {
      ownerBookings.set(owner.id, []);
    }
    ownerBookings.get(owner.id)!.push(booking);
  }

  // Calculate payouts with eligibility tracking
  const payouts: PayoutCalculation[] = [];

  for (const [ownerId, ownerBookingList] of ownerBookings) {
    const owner = charters.find((c) => c.owner?.id === ownerId)?.owner;
    if (!owner) continue;

    // Separate eligible vs all bookings
    const eligibleBookings = ownerBookingList.filter((b: PendingBooking) =>
      isPayoutEligible(b.date)
    );

    const totalEarnings = ownerBookingList.reduce(
      (sum: number, b: PendingBooking) => sum + Number(b.captainEarnings || 0),
      0
    );

    const eligibleEarnings = eligibleBookings.reduce(
      (sum: number, b: PendingBooking) => sum + Number(b.captainEarnings || 0),
      0
    );

    // Find date range
    const sortedByDate = [...ownerBookingList].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
    const oldestTripDate = sortedByDate[0]?.date || null;

    const eligibleSortedByDate = [...eligibleBookings].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
    const newestEligibleDate = eligibleSortedByDate[0]?.date || null;

    // Decrypt bank details for display
    let accountNumber: string | null = null;
    let accountHolder: string | null = null;
    try {
      if (owner.verification?.bankAccountNumber) {
        accountNumber = decrypt(owner.verification.bankAccountNumber);
      }
      if (owner.verification?.bankAccountHolder) {
        accountHolder = decrypt(owner.verification.bankAccountHolder);
      }
    } catch (error) {
      console.error(
        `Failed to decrypt bank details for owner ${ownerId}:`,
        error
      );
    }

    payouts.push({
      ownerId,
      ownerName: owner.name || "Unknown",
      ownerEmail: owner.email,
      totalEarnings,
      bookingCount: ownerBookingList.length,
      bookingIds: ownerBookingList.map((b: PendingBooking) => b.id),
      bankName: owner.verification?.bankName || null,
      accountNumber,
      accountHolder,
      // Eligibility tracking
      eligibleEarnings,
      eligibleBookingCount: eligibleBookings.length,
      eligibleBookingIds: eligibleBookings.map((b: PendingBooking) => b.id),
      oldestTripDate,
      newestEligibleDate,
    });
  }

  // Sort by eligible earnings (highest first), then total earnings
  return payouts.sort((a, b) => {
    if (b.eligibleEarnings !== a.eligibleEarnings) {
      return b.eligibleEarnings - a.eligibleEarnings;
    }
    return b.totalEarnings - a.totalEarnings;
  });
}

/**
 * Create payout batch from calculations
 */
export async function createPayoutBatch(
  calculations: PayoutCalculation[],
  createdBy: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ batchId: string; payouts: Payout[] }> {
  const batchId = generateBatchId(periodStart);
  const payouts: Payout[] = [];

  for (const calc of calculations) {
    // Validate bank details
    if (!calc.bankName || !calc.accountNumber || !calc.accountHolder) {
      throw new Error(`Missing bank details for owner ${calc.ownerId}`);
    }

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        batchId: `${batchId}-${calc.ownerId.substring(0, 8)}`,
        ownerId: calc.ownerId,
        periodStart,
        periodEnd,
        totalEarnings: calc.totalEarnings,
        deductions: 0,
        netPayout: calc.totalEarnings,
        bookingIds: calc.bookingIds,
        bookingCount: calc.bookingCount,
        bankName: calc.bankName,
        accountNumber: calc.accountNumber,
        accountHolder: calc.accountHolder,
        status: "PENDING",
        createdBy,
      },
    });

    // Update bookings to reference batch
    await prismaMarket.booking.updateMany({
      where: { id: { in: calc.bookingIds } },
      data: {
        payoutStatus: "SCHEDULED",
        payoutBatchId: payout.batchId,
      },
    });

    // Audit log
    const { writeAuditLog } = await import("@/server/audit");
    await writeAuditLog({
      actorUserId: createdBy,
      entityType: "payout",
      entityId: payout.id,
      action: "payout_created",
      after: payout,
    });

    payouts.push(payout as Payout);
  }

  return { batchId, payouts };
}

/**
 * Approve payout (ADMIN only)
 */

// TODO(@fishon/packages): Move this to shared package if used in multiple apps
type Payout = Awaited<ReturnType<typeof prisma.payout.create>>;

export async function approvePayout(payoutId: string, approvedBy: string) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "PENDING") {
    throw new Error(`Cannot approve payout with status ${payout.status}`);
  }

  // Update payout
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "APPROVED",
      approvedBy,
      scheduledAt: new Date(),
    },
  });

  // Audit log
  const { writeAuditLog } = await import("@/server/audit");
  await writeAuditLog({
    actorUserId: approvedBy,
    entityType: "payout",
    entityId: payoutId,
    action: "payout_approved",
    before: payout,
    after: updated,
  });

  return updated;
}

/**
 * Mark payout as completed
 */
export async function markPayoutCompleted(
  payoutId: string,
  transferReference: string,
  completedBy: string
) {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new Error("Payout not found");
  }

  if (payout.status !== "APPROVED" && payout.status !== "PROCESSING") {
    throw new Error(`Cannot complete payout with status ${payout.status}`);
  }

  // Update payout
  const updated = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: "COMPLETED",
      transferReference,
      processedAt:
        payout.status === "APPROVED" ? new Date() : payout.processedAt,
      completedAt: new Date(),
    },
  });

  // Update bookings
  await prismaMarket.booking.updateMany({
    where: { id: { in: payout.bookingIds } },
    data: { payoutStatus: "COMPLETED" },
  });

  // Audit log
  const { writeAuditLog } = await import("@/server/audit");
  await writeAuditLog({
    actorUserId: completedBy,
    entityType: "payout",
    entityId: payoutId,
    action: "payout_completed",
    before: payout,
    after: updated,
  });

  return updated;
}

/**
 * Get all payouts with filters
 */
export async function getPayouts(filters?: {
  status?: string;
  ownerId?: string;
  limit?: number;
}) {
  // Use Prisma.PayoutWhereInput for type safety
  const where: import("@prisma/client").Prisma.PayoutWhereInput = {};

  if (filters?.status) {
    where.status = filters.status as import("@prisma/client").PayoutStatus;
  }

  if (filters?.ownerId) {
    where.ownerId = filters.ownerId;
  }

  return await prisma.payout.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit,
  });
}

/**
 * Get single payout by ID
 */
export async function getPayoutById(id: string) {
  return await prisma.payout.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Helper function to generate batch ID from date
 */
function generateBatchId(date: Date): string {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * =======================================
 * CAPTAIN PAYOUT VIEW (Phase 3)
 * =======================================
 */

export interface CaptainEarningsSummary {
  totalEarnings: number; // All-time captain earnings
  totalEarningsThisMonth: number; // Current month
  totalEarningsLastMonth: number; // Previous month
  totalEarningsThisPeriod: number; // Earnings for selected period
  totalEarningsLastPeriod: number; // Earnings for comparison period
  pendingPayout: number; // Earnings awaiting payout
  completedPayouts: number; // Total paid out
  nextPayoutDate: Date | null; // Estimated next payout
  bookingCount: number; // Total PAID bookings
  bookingCountThisPeriod: number; // Bookings in selected period
  commissionRate: number; // Current commission rate (based on pricing plan)
  periodLabel: string; // Label for selected period (e.g., "This Week", "This Month")
}

/**
 * Get earnings summary for a specific captain/owner
 */
export async function getCaptainEarningsSummary(
  ownerId: string,
  period: TimePeriod = "30d"
): Promise<CaptainEarningsSummary> {
  // Fetch captain's charters to determine pricing plan
  const charters = await prisma.charter.findMany({
    where: { ownerId },
    select: { pricingPlan: true },
  });

  // Determine lowest commission rate from all charters
  const commissionRate = charters.some((c) => c.pricingPlan === "GOLD")
    ? 0.05
    : charters.some((c) => c.pricingPlan === "SILVER")
      ? 0.08
      : 0.1; // BASIC

  // Fetch all bookings for this owner's charters
  const bookings = await getBookingsFinancial({
    ownerId,
    status: "PAID",
  });

  // Calculate date boundaries based on selected period
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  // Period-specific boundaries
  const periodDays =
    period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
  const periodStart = new Date(
    now.getTime() - periodDays * 24 * 60 * 60 * 1000
  );
  const lastPeriodStart = new Date(
    periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000
  );
  const lastPeriodEnd = new Date(periodStart.getTime() - 1);

  // Period labels
  const periodLabels: Record<TimePeriod, string> = {
    "7d": "This Week",
    "30d": "This Month",
    "90d": "This Quarter",
    "1y": "This Year",
    all: "All Time",
  };

  // Calculate metrics
  const totalEarnings = bookings.reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsThisMonth = bookings
    .filter((b) => b.createdAt >= currentMonthStart)
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsLastMonth = bookings
    .filter((b) => b.createdAt >= lastMonthStart && b.createdAt <= lastMonthEnd)
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsThisPeriod =
    period === "all"
      ? totalEarnings
      : bookings
          .filter((b) => b.createdAt >= periodStart)
          .reduce((sum, b) => sum + b.captainEarnings, 0);

  const totalEarningsLastPeriod =
    period === "all"
      ? 0
      : bookings
          .filter(
            (b) =>
              b.createdAt >= lastPeriodStart && b.createdAt <= lastPeriodEnd
          )
          .reduce((sum, b) => sum + b.captainEarnings, 0);

  const bookingCountThisPeriod =
    period === "all"
      ? bookings.length
      : bookings.filter((b) => b.createdAt >= periodStart).length;

  const pendingPayout = bookings
    .filter((b) => b.payoutStatus === "PENDING")
    .reduce((sum, b) => sum + b.captainEarnings, 0);

  // Fetch completed payouts
  const payouts = await prisma.payout.findMany({
    where: {
      ownerId,
      status: "COMPLETED",
    },
  });

  const completedPayouts = payouts.reduce(
    (sum, p) => sum + Number(p.netPayout),
    0
  );

  // Estimate next payout date (e.g., 1st of next month)
  const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    totalEarnings,
    totalEarningsThisMonth,
    totalEarningsLastMonth,
    totalEarningsThisPeriod,
    totalEarningsLastPeriod,
    pendingPayout,
    completedPayouts,
    nextPayoutDate: pendingPayout > 0 ? nextPayoutDate : null,
    bookingCount: bookings.length,
    bookingCountThisPeriod,
    commissionRate,
    periodLabel: periodLabels[period],
  };
}

/**
 * Get payout history for a captain
 */
export async function getCaptainPayoutHistory(ownerId: string) {
  return await prisma.payout.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get bookings for a specific captain with earnings data
 */
export async function getCaptainBookings(
  ownerId: string,
  filters?: {
    payoutStatus?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }
) {
  return await getBookingsFinancial({
    ownerId,
    status: "PAID",
    ...filters,
  });
}

/**
 * Calculate date range for a given period from today
 *
 * @param period - "7d", "30d", "90d", "1y", or "all"
 * @returns Object with startDate and endDate boundaries
 */
function getPeriodBoundaries(period: TimePeriod): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);

  if (period === "all") {
    startDate.setFullYear(1970); // Very far past
  } else if (period === "7d") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (period === "30d") {
    startDate.setDate(startDate.getDate() - 30);
  } else if (period === "90d") {
    startDate.setDate(startDate.getDate() - 90);
  } else if (period === "1y") {
    startDate.setFullYear(startDate.getFullYear() - 1);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

/**
 * Get earnings summary for a captain with period comparison
 *
 * Compares current period earnings to previous period and calculates metrics
 * needed for the dashboard earnings card. Period is compared to an equal
 * preceding period (e.g., last 30d vs previous 30d).
 *
 * Data sources:
 * - Captain DB: Charter (to determine pricing plan and commission rate)
 * - Market DB: Booking (PAID bookings with captainEarnings and payoutStatus)
 * - Captain DB: Payout (to verify payout history)
 *
 * @param userId - Captain's user ID (used to find owned charters)
 * @param period - Time period to analyze: "7d" (default), "30d", "90d", "1y", or "all"
 * @returns Earnings summary with current/previous comparison and next payout estimate
 *
 * @example
 * const summary = await getEarningsSummary("user-123", "30d");
 * console.log(summary.currentPeriod); // Earnings this month
 * console.log(summary.percentChange); // Growth vs last month
 * console.log(summary.pending); // Awaiting payout
 */
export async function getEarningsSummary(
  userId: string,
  period: TimePeriod = "30d"
): Promise<EarningsSummary> {
  // Fetch captain's charters to determine commission rate
  const charters = await prisma.charter.findMany({
    where: { ownerId: userId },
    select: { id: true, pricingPlan: true },
  });

  // Determine lowest commission rate from all charters
  const commissionRate = charters.some((c) => c.pricingPlan === "GOLD")
    ? 0.05
    : charters.some((c) => c.pricingPlan === "SILVER")
      ? 0.08
      : 0.1; // BASIC

  if (charters.length === 0) {
    return {
      currentPeriod: 0,
      previousPeriod: 0,
      percentChange: 0,
      pending: 0,
      nextPayoutDate: null,
      commissionRate,
    };
  }

  const charterIds = charters.map((c) => c.id);

  // Get period boundaries
  const { startDate: currentStart, endDate: currentEnd } =
    getPeriodBoundaries(period);

  // Calculate previous period boundaries
  const periodMs = currentStart.getTime() - currentEnd.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1); // Just before current period starts
  const previousStart = new Date(previousEnd.getTime() - Math.abs(periodMs));

  // Fetch all PAID bookings for this captain's charters
  const bookings = await prismaMarket.booking.findMany({
    where: {
      charterId: { in: charterIds },
      status: "PAID",
    },
    select: {
      id: true,
      captainEarnings: true,
      payoutStatus: true,
      createdAt: true,
    },
  });

  // Partition bookings by period
  type Booking = (typeof bookings)[0];
  const currentPeriodBookings = bookings.filter(
    (b: Booking) => b.createdAt >= currentStart && b.createdAt <= currentEnd
  );
  const previousPeriodBookings = bookings.filter(
    (b: Booking) => b.createdAt >= previousStart && b.createdAt <= previousEnd
  );

  // Calculate earnings
  const currentPeriod = currentPeriodBookings.reduce(
    (sum: number, b: Booking) => {
      const earnings = b.captainEarnings
        ? typeof b.captainEarnings === "number"
          ? b.captainEarnings
          : Number(b.captainEarnings)
        : 0;
      return sum + (isNaN(earnings) ? 0 : earnings);
    },
    0
  );

  const previousPeriod = previousPeriodBookings.reduce(
    (sum: number, b: Booking) => {
      const earnings = b.captainEarnings
        ? typeof b.captainEarnings === "number"
          ? b.captainEarnings
          : Number(b.captainEarnings)
        : 0;
      return sum + (isNaN(earnings) ? 0 : earnings);
    },
    0
  );

  // Calculate percent change
  let percentChange = 0;
  if (previousPeriod === 0) {
    // If previous was 0, show 100% if current > 0 or -100 if current = 0
    percentChange = currentPeriod > 0 ? 100 : 0;
  } else {
    percentChange = ((currentPeriod - previousPeriod) / previousPeriod) * 100;
  }

  // Calculate pending payouts (PENDING status bookings)
  const pending = bookings
    .filter((b: Booking) => b.payoutStatus === "PENDING")
    .reduce((sum: number, b: Booking) => {
      const earnings = b.captainEarnings
        ? typeof b.captainEarnings === "number"
          ? b.captainEarnings
          : Number(b.captainEarnings)
        : 0;
      return sum + (isNaN(earnings) ? 0 : earnings);
    }, 0);

  // Estimate next payout date (1st of next month)
  const now = new Date();
  const nextPayoutDate =
    pending > 0 ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : null;

  return {
    currentPeriod: Math.round(currentPeriod * 100) / 100,
    previousPeriod: Math.round(previousPeriod * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    pending: Math.round(pending * 100) / 100,
    nextPayoutDate,
    commissionRate,
  };
}
