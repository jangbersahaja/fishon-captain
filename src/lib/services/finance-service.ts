import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";

export type TimePeriod = "7d" | "30d" | "90d" | "1y" | "all";

export interface RevenueStats {
  totalRevenue: number; // Sum of finalPrice (PAID bookings)
  platformRevenue: number; // Sum of platformFee
  captainRevenue: number; // Sum of captainEarnings
  bookingCount: number; // Count of PAID bookings
  avgBookingValue: number; // Average finalPrice
  refundsIssued: number; // Sum of refundAmount
  pendingPayouts: number; // Sum where payoutStatus=PENDING
}

export interface BookingFinancial {
  id: string;
  charterId: string;
  charterName: string;
  ownerId: string;
  ownerName: string;
  anglerName: string;
  tripDate: Date;
  finalPrice: number;
  platformFee: number;
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
 * Get revenue statistics for a given time period
 */
export async function getRevenueStats(
  period: TimePeriod
): Promise<RevenueStats> {
  const dateFilter = getPeriodFilter(period);

  const result = await prismaMarket.booking.aggregate({
    where: {
      status: "PAID",
      paidAt: dateFilter,
    },
    _sum: {
      finalPrice: true,
      platformFee: true,
      captainEarnings: true,
      refundAmount: true,
    },
    _count: true,
    _avg: {
      finalPrice: true,
    },
  });

  const pendingPayouts = await prismaMarket.booking.aggregate({
    where: {
      status: "PAID",
      payoutStatus: "PENDING",
    },
    _sum: {
      captainEarnings: true,
    },
  });

  return {
    totalRevenue: Number(result._sum.finalPrice || 0),
    platformRevenue: Number(result._sum.platformFee || 0),
    captainRevenue: Number(result._sum.captainEarnings || 0),
    bookingCount: result._count,
    avgBookingValue: Number(result._avg.finalPrice || 0),
    refundsIssued: Number(result._sum.refundAmount || 0),
    pendingPayouts: Number(pendingPayouts._sum.captainEarnings || 0),
  };
}

/**
 * Get bookings with financial data for admin dashboard
 */
export async function getBookingsFinancial(filters?: {
  status?: string;
  payoutStatus?: string;
  ownerId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
}): Promise<BookingFinancial[]> {
  // Build where clause
  // Using any type since Booking is from market DB schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status as any;
  }

  if (filters?.payoutStatus) {
    where.payoutStatus = filters.payoutStatus as any;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = filters.startDate;
    if (filters.endDate) where.date.lte = filters.endDate;
  }

  // Fetch bookings from market DB
  const bookings = await prismaMarket.booking.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: filters?.limit || 100,
  });

  // Extract unique charterIds and userIds
  const charterIds = [
    ...new Set(bookings.map((b: any) => b.charterId)),
  ] as string[];
  const userIds = [
    ...new Set(bookings.map((b: any) => b.userId).filter(Boolean) as string[]),
  ];

  // Fetch charter data from captain DB
  const charters = await prisma.charter.findMany({
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

  // Fetch angler data from market DB
  const anglers = await prismaMarket.marketUser.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });

  // Build lookup maps
  const charterMap = new Map(charters.map((c) => [c.id, c]));
  const anglerMap = new Map(anglers.map((a: any) => [a.id, a]));

  // Enrich bookings
  const enriched = bookings.map((booking: any) => {
    const charter = charterMap.get(booking.charterId);
    const angler = booking.userId ? anglerMap.get(booking.userId) : null;

    return {
      id: booking.id,
      charterId: booking.charterId,
      charterName: charter?.name || "Unknown Charter",
      ownerId: charter?.ownerId || "",
      ownerName: charter?.captain?.user?.name || "Unknown Owner",
      anglerName:
        (angler as any)?.name ||
        (booking.guestFirstName
          ? `${booking.guestFirstName} ${booking.guestLastName}`.trim()
          : "Guest"),
      tripDate: booking.date,
      finalPrice: Number(booking.finalPrice),
      platformFee: Number(booking.platformFee || 0),
      captainEarnings: Number(booking.captainEarnings || 0),
      paymentMethod: booking.paymentMethod,
      paymentTransactionId: booking.paymentTransactionId,
      paidAt: booking.paidAt,
      payoutStatus: booking.payoutStatus,
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      createdAt: booking.createdAt,
      status: booking.status,
    };
  });

  // Filter by ownerId if specified (after enrichment)
  if (filters?.ownerId) {
    return enriched.filter((b: any) => b.ownerId === filters.ownerId);
  }

  // Filter by search query (charter name or angler name)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    return enriched.filter(
      (b: any) =>
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
