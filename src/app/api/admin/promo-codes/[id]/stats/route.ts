/**
 * Admin Promo Code Statistics API
 *
 * GET /api/admin/promo-codes/[id]/stats - Get usage statistics for a promo code
 */

import authOptions from "@/lib/auth";
import { prismaMarket } from "@/lib/prisma-market";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/promo-codes/[id]/stats
 * Get detailed usage statistics for a promo code
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch promo code with related data
    const promoCode = await prismaMarket.promoCode.findUnique({
      where: { id },
      include: {
        bookings: {
          select: {
            id: true,
            status: true,
            finalPrice: true,
            discount: true,
            platformFee: true,
            serviceFee: true,
            tax: true,
            days: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        assignments: {
          select: {
            id: true,
            assignedAt: true,
            usedAt: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
    });

    if (!promoCode) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Calculate statistics
    const totalBookings = promoCode.bookings.length;
    const totalDiscountGiven = promoCode.bookings.reduce(
      (sum: number, booking: { discount?: unknown }) => {
        if (booking.discount && typeof booking.discount === "object") {
          const discount = booking.discount as { amount?: number };
          return sum + (discount.amount || 0);
        }
        return sum;
      },
      0
    );

    // Calculate Fishon's actual revenue
    // Formula: platformFee - discount
    // Note: serviceFee is charged to angler (in finalPrice), NOT deducted from Fishon
    // Discount is absorbed entirely by Fishon from the 10% commission
    const fishonRevenue = promoCode.bookings
      .filter(
        (b: { status: string }) =>
          b.status === "PAID" || b.status === "COMPLETED"
      )
      .reduce(
        (
          sum: number,
          booking: { platformFee?: number | null; discount?: unknown }
        ) => {
          const platformFee = Number(booking.platformFee || 0);
          const discountAmount =
            booking.discount && typeof booking.discount === "object"
              ? (booking.discount as { amount?: number }).amount || 0
              : 0;

          // Fishon's net revenue: platform commission minus discount absorbed
          const netRevenue = platformFee - discountAmount;
          return sum + netRevenue;
        },
        0
      );

    // Total sales generated (what anglers paid)
    const totalSales = promoCode.bookings
      .filter(
        (b: { status: string }) =>
          b.status === "PAID" || b.status === "COMPLETED"
      )
      .reduce(
        (sum: number, booking: { finalPrice: number | string }) =>
          sum + Number(booking.finalPrice),
        0
      );

    // Calculate total service fee (payment gateway charges)
    const totalServiceFee = promoCode.bookings
      .filter(
        (b: { status: string }) =>
          b.status === "PAID" || b.status === "COMPLETED"
      )
      .reduce(
        (sum: number, booking: { serviceFee?: number | null }) =>
          sum + Number(booking.serviceFee || 0),
        0
      );

    // Calculate total tax collected
    const totalTax = promoCode.bookings
      .filter(
        (b: { status: string }) =>
          b.status === "PAID" || b.status === "COMPLETED"
      )
      .reduce((sum: number, booking: { tax?: unknown }) => {
        if (booking.tax && typeof booking.tax === "object") {
          const tax = booking.tax as { amount?: number };
          return sum + (tax.amount || 0);
        }
        return sum;
      }, 0);

    const bookingsByStatus = promoCode.bookings.reduce(
      (acc: Record<string, number>, booking: { status: string }) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const assignmentsUsed = promoCode.assignments.filter(
      (a: { usedAt: Date | null }) => a.usedAt !== null
    ).length;
    const assignmentsUnused = promoCode.assignments.filter(
      (a: { usedAt: Date | null }) => a.usedAt === null
    ).length;

    return NextResponse.json({
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        name: promoCode.name,
        description: promoCode.description,
        type: promoCode.type,
        percentage: promoCode.percentage,
        fixedAmount: promoCode.fixedAmount,
        scope: promoCode.scope,
        status: promoCode.status,
        startDate: promoCode.startDate,
        endDate: promoCode.endDate,
        maxUses: promoCode.maxUses,
        usesCount: promoCode.usesCount,
        maxUsesPerUser: promoCode.maxUsesPerUser,
        minPurchase: promoCode.minPurchase,
        maxDiscount: promoCode.maxDiscount,
        newUsersOnly: promoCode.newUsersOnly,
        specificCharters: promoCode.specificCharters,
      },
      statistics: {
        totalBookings,
        totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
        totalSales: Math.round(totalSales * 100) / 100,
        fishonRevenue: Math.round(fishonRevenue * 100) / 100,
        totalServiceFee: Math.round(totalServiceFee * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        bookingsByStatus,
        assignmentsTotal: promoCode.assignments.length,
        assignmentsUsed,
        assignmentsUnused,
        conversionRate:
          promoCode.assignments.length > 0
            ? Math.round(
                (assignmentsUsed / promoCode.assignments.length) * 100 * 100
              ) / 100
            : 0,
      },
      recentBookings: promoCode.bookings
        .slice(0, 10)
        .map(
          (booking: {
            id: string;
            status: string;
            finalPrice: number | string;
            discount: unknown;
            createdAt: Date;
            user: { name: string; email: string };
          }) => ({
            id: booking.id,
            status: booking.status,
            finalPrice: Number(booking.finalPrice),
            discount: booking.discount,
            createdAt: booking.createdAt,
            userName: booking.user.name,
            userEmail: booking.user.email,
          })
        ),
      recentAssignments: promoCode.assignments
        .slice(0, 10)
        .map(
          (assignment: {
            id: string;
            assignedAt: Date;
            usedAt: Date | null;
            user: { name: string; email: string };
          }) => ({
            id: assignment.id,
            assignedAt: assignment.assignedAt,
            usedAt: assignment.usedAt,
            userName: assignment.user.name,
            userEmail: assignment.user.email,
          })
        ),
    });
  } catch (error) {
    console.error("[PromoCodeStatsAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo code statistics" },
      { status: 500 }
    );
  }
}
