/**
 * Admin Promo Code Detail API
 *
 * PATCH  /api/admin/promo-codes/[id]   - Update promo code
 * DELETE /api/admin/promo-codes/[id]   - Delete promo code
 */

import authOptions from "@/lib/auth";
import { prismaMarket } from "@/lib/prisma-market";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for promo code update
const updatePromoCodeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  percentage: z.coerce.number().min(1).max(100).optional(),
  fixedAmount: z.coerce.number().positive().optional(),
  scope: z.enum(["UNIVERSAL", "REGISTRATION"]).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  maxUses: z.coerce.number().int().positive().optional().nullable(),
  maxUsesPerUser: z.coerce.number().int().positive().optional(),
  minPurchase: z.coerce.number().positive().optional().nullable(),
  maxDiscount: z.coerce.number().positive().optional().nullable(),
  newUsersOnly: z.boolean().optional(),
  specificCharters: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
});

/**
 * PATCH /api/admin/promo-codes/[id]
 * Update promo code
 */
export async function PATCH(
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
    const body = await req.json();

    console.log("[PromoCodeAPI] PATCH body:", JSON.stringify(body, null, 2));

    const validated = updatePromoCodeSchema.parse(body);

    // Check if promo code exists
    const existing = await prismaMarket.promoCode.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Update promo code
    const updateData: Record<string, unknown> = { ...validated };

    if (validated.startDate) {
      updateData.startDate = new Date(validated.startDate);
    }
    if (validated.endDate) {
      updateData.endDate = new Date(validated.endDate);
    }

    const promoCode = await prismaMarket.promoCode.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      promoCode,
      message: "Promo code updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        "[PromoCodeAPI] Validation error:",
        JSON.stringify(error.issues, null, 2)
      );
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[PromoCodeAPI] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update promo code" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promo-codes/[id]
 * Delete promo code (soft delete by setting status to INACTIVE)
 */
export async function DELETE(
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

    // Check if promo code exists
    const existing = await prismaMarket.promoCode.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Promo code not found" },
        { status: 404 }
      );
    }

    // Check if promo code has been used
    if (existing._count.bookings > 0) {
      // Soft delete - just deactivate
      const promoCode = await prismaMarket.promoCode.update({
        where: { id },
        data: { status: "INACTIVE" },
      });

      return NextResponse.json({
        promoCode,
        message: "Promo code deactivated (has existing bookings)",
      });
    }

    // Hard delete if never used
    await prismaMarket.promoCode.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Promo code deleted successfully",
    });
  } catch (error) {
    console.error("[PromoCodeAPI] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete promo code" },
      { status: 500 }
    );
  }
}
