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

  // Fetch all PAID bookings with financial fields for the period
  const bookings = await prismaMarket.booking.findMany({
    where: {
      status: "PAID",
      ...(dateFilter && { createdAt: dateFilter }),
    },
    select: {
      finalPrice: true,
      platformFee: true,
      captainEarnings: true,
      refundAmount: true,
      payoutStatus: true,
    },
  });

  type BookingFinancial = (typeof bookings)[0];

  // Calculate revenue metrics
  const totalRevenue = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.finalPrice || 0),
    0
  );
  const bookingCount = bookings.length;
  const avgBookingValue = bookingCount > 0 ? totalRevenue / bookingCount : 0;

  const platformRevenue = bookings.reduce(
    (sum: number, b: BookingFinancial) => sum + Number(b.platformFee || 0),
    0
  );

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
    platformRevenue,
    captainRevenue,
    bookingCount,
    avgBookingValue,
    refundsIssued,
    pendingPayouts,
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
}

/**
 * Calculate pending payouts for all captains with PAID bookings
 */
export async function calculatePendingPayouts(): Promise<PayoutCalculation[]> {
  // Fetch all PAID bookings with PENDING payout status
  const bookings = await prismaMarket.booking.findMany({
    where: {
      status: "PAID",
      payoutStatus: "PENDING",
      captainEarnings: { not: null },
    },
    select: {
      id: true,
      charterId: true,
      captainEarnings: true,
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

  // Calculate payouts
  const payouts: PayoutCalculation[] = [];

  for (const [ownerId, ownerBookingList] of ownerBookings) {
    const owner = charters.find((c) => c.owner?.id === ownerId)?.owner;
    if (!owner) continue;

    const totalEarnings = ownerBookingList.reduce(
      (sum: number, b: PendingBooking) => sum + Number(b.captainEarnings || 0),
      0
    );

    payouts.push({
      ownerId,
      ownerName: owner.name || "Unknown",
      ownerEmail: owner.email,
      totalEarnings,
      bookingCount: ownerBookingList.length,
      bookingIds: ownerBookingList.map((b: PendingBooking) => b.id),
      bankName: owner.verification?.bankName || null,
      accountNumber: owner.verification?.bankAccountNumber || null,
      accountHolder: owner.verification?.bankAccountHolder || null,
    });
  }

  // Sort by total earnings (highest first)
  return payouts.sort((a, b) => b.totalEarnings - a.totalEarnings);
}

/**
 * Create payout batch from calculations
 */
export async function createPayoutBatch(
  calculations: PayoutCalculation[],
  createdBy: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ batchId: string; payouts: any[] }> {
  const batchId = generateBatchId(periodStart);
  const payouts = [];

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

    payouts.push(payout);
  }

  return { batchId, payouts };
}

/**
 * Approve payout (ADMIN only)
 */
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
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
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
