import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/finance/payments
 *
 * Fetch payment records for admin monitoring.
 * Supports filtering by date range, payment status, and payment method.
 */
export async function GET(request: Request) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check (STAFF or ADMIN)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["STAFF", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const paymentStatus = searchParams.get("paymentStatus");
    const paymentMethod = searchParams.get("paymentMethod");

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Date filter (based on createdAt)
    if (startDateParam && endDateParam) {
      where.createdAt = {
        gte: new Date(startDateParam),
        lte: new Date(endDateParam),
      };
    }

    // Payment method filter
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // Payment status filter (derived from payment dates)
    if (paymentStatus) {
      switch (paymentStatus) {
        case "AUTHORIZED":
          // Has authorization but not captured
          where.paymentAuthorizedAt = { not: null };
          where.paymentCapturedAt = null;
          where.paymentReleasedAt = null;
          break;
        case "CAPTURED":
          // Payment captured (either paymentCapturedAt or paidAt set)
          where.OR = [
            { paymentCapturedAt: { not: null } },
            { paidAt: { not: null } },
          ];
          where.refundStatus = null;
          break;
        case "RELEASED":
          // Token was released/voided
          where.paymentReleasedAt = { not: null };
          break;
        case "PENDING":
          // No payment dates set yet
          where.paymentAuthorizedAt = null;
          where.paymentCapturedAt = null;
          where.paidAt = null;
          where.paymentReleasedAt = null;
          break;
        case "REFUNDED":
          where.refundStatus = { not: null };
          break;
        case "FAILED":
          // Status indicates failure
          where.status = { in: ["REJECTED", "CANCELLED", "EXPIRED"] };
          break;
      }
    }

    // Fetch bookings with payment data from market DB
    const bookings = await prismaMarket.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        charterId: true,
        userId: true,
        guests: true, // JSON with participants array
        finalPrice: true,
        paymentMethod: true,
        paymentFlow: true,
        paymentTransactionId: true,
        paymentIntentId: true,
        paymentAuthorizedAt: true,
        paymentCapturedAt: true,
        paymentReleasedAt: true,
        paidAt: true,
        status: true,
        refundStatus: true,
        refundAmount: true,
        refundedAt: true,
        createdAt: true,
      },
    });

    // Extract unique charterIds and userIds
    type BookingRecord = (typeof bookings)[0];
    const charterIds = [
      ...new Set(bookings.map((b: BookingRecord) => b.charterId)),
    ] as string[];
    const userIds = [
      ...new Set(bookings.map((b: BookingRecord) => b.userId).filter(Boolean)),
    ] as string[];

    // Fetch charter names from captain DB
    const charters = await prisma.charter.findMany({
      where: { id: { in: charterIds } },
      select: { id: true, name: true },
    });
    const charterMap = new Map(charters.map((c) => [c.id, c.name]));

    // Fetch angler names from market DB
    const anglers = await prismaMarket.marketUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const anglerMap = new Map(
      anglers.map((a: { id: string; name: string }) => [a.id, a.name])
    );

    // Helper to extract guest name from guests JSON
    const getGuestName = (guests: unknown): string => {
      if (!guests || typeof guests !== "object") return "Guest";
      const guestsObj = guests as {
        participants?: Array<{ name?: string; isBooker?: boolean }>;
      };
      // Find the booker or first participant with a name
      const booker = guestsObj.participants?.find((p) => p.isBooker);
      if (booker?.name) return booker.name;
      const firstWithName = guestsObj.participants?.find((p) => p.name);
      if (firstWithName?.name) return firstWithName.name;
      return "Guest";
    };

    // Transform to payment records
    const payments = bookings.map((booking: BookingRecord) => ({
      id: booking.id,
      bookingId: booking.id,
      charterName: charterMap.get(booking.charterId) || "Unknown Charter",
      anglerName: booking.userId
        ? anglerMap.get(booking.userId) || "Unknown"
        : getGuestName(booking.guests),
      amount: Number(booking.finalPrice),
      paymentMethod: booking.paymentMethod,
      paymentFlow: booking.paymentFlow,
      paymentTransactionId: booking.paymentTransactionId,
      paymentIntentId: booking.paymentIntentId,
      status: booking.status,
      bookingStatus: booking.status,
      paymentAuthorizedAt: booking.paymentAuthorizedAt,
      paymentCapturedAt: booking.paymentCapturedAt,
      paymentReleasedAt: booking.paymentReleasedAt,
      paidAt: booking.paidAt,
      createdAt: booking.createdAt,
      refundStatus: booking.refundStatus,
      refundAmount: booking.refundAmount ? Number(booking.refundAmount) : null,
      refundedAt: booking.refundedAt,
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}
