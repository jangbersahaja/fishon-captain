/**
 * Admin Pricing Update API
 *
 * PATCH /api/admin/pricing/:id - Update trip pricing (base price and promo price)
 */

import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/audit";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const updatePricingSchema = z.object({
  basePrice: z.number().positive("Base price must be positive"),
  minPrice: z
    .number()
    .positive("Min price must be positive")
    .nullable()
    .optional(),
  currentPrice: z
    .number()
    .positive("Current price must be positive")
    .nullable()
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await ctx.params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch existing trip
    const existingTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        charter: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await req.json();
    console.log("[PricingAPI] PATCH request body:", body);

    const validation = updatePricingSchema.safeParse(body);

    if (!validation.success) {
      console.error("[PricingAPI] Validation failed:", validation.error.issues);
      return NextResponse.json(
        {
          error: "Validation error",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { basePrice, minPrice, currentPrice } = validation.data;

    // Additional validation: minPrice must be <= basePrice
    if (minPrice !== null && minPrice !== undefined) {
      if (minPrice > basePrice) {
        return NextResponse.json(
          { error: "Min price must be less than or equal to base price" },
          { status: 400 }
        );
      }
    }

    // Additional validation: currentPrice must be >= minPrice (if minPrice exists)
    if (currentPrice !== null && currentPrice !== undefined) {
      if (
        minPrice !== null &&
        minPrice !== undefined &&
        currentPrice < minPrice
      ) {
        return NextResponse.json(
          { error: "Current price cannot be below min price" },
          { status: 400 }
        );
      }
    }

    // Update trip pricing
    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        price: new Prisma.Decimal(basePrice),
        promoPrice:
          minPrice !== null && minPrice !== undefined
            ? new Prisma.Decimal(minPrice)
            : null,
        priceOverride:
          currentPrice !== null && currentPrice !== undefined
            ? new Prisma.Decimal(currentPrice)
            : null,
      },
    });

    // Write audit log
    await writeAuditLog({
      actorUserId: session.user.id,
      entityType: "trip" as const,
      entityId: tripId,
      action: "pricing.update",
      before: {
        tripName: existingTrip.name,
        charterId: existingTrip.charterId,
        charterName: existingTrip.charter.name,
        basePrice: Number(existingTrip.price),
        minPrice: existingTrip.promoPrice
          ? Number(existingTrip.promoPrice)
          : null,
        currentPrice: existingTrip.priceOverride
          ? Number(existingTrip.priceOverride)
          : null,
      },
      after: {
        tripName: existingTrip.name,
        charterId: existingTrip.charterId,
        charterName: existingTrip.charter.name,
        basePrice: Number(updatedTrip.price),
        minPrice: updatedTrip.promoPrice
          ? Number(updatedTrip.promoPrice)
          : null,
        currentPrice: updatedTrip.priceOverride
          ? Number(updatedTrip.priceOverride)
          : null,
      },
      changed: [
        existingTrip.price !== updatedTrip.price ? "basePrice" : null,
        existingTrip.promoPrice !== updatedTrip.promoPrice ? "minPrice" : null,
        existingTrip.priceOverride !== updatedTrip.priceOverride
          ? "currentPrice"
          : null,
      ].filter(Boolean) as string[],
    });

    console.log("[PricingAPI] Update successful:", {
      tripId: updatedTrip.id,
      basePrice: Number(updatedTrip.price),
      minPrice: updatedTrip.promoPrice ? Number(updatedTrip.promoPrice) : null,
      currentPrice: updatedTrip.priceOverride
        ? Number(updatedTrip.priceOverride)
        : null,
    });

    return NextResponse.json({
      success: true,
      trip: {
        id: updatedTrip.id,
        name: updatedTrip.name,
        basePrice: Number(updatedTrip.price),
        minPrice: updatedTrip.promoPrice
          ? Number(updatedTrip.promoPrice)
          : null,
        currentPrice: updatedTrip.priceOverride
          ? Number(updatedTrip.priceOverride)
          : null,
      },
    });
  } catch (error) {
    console.error("[PricingAPI] PATCH error:", error);

    // Return more detailed error for debugging
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update pricing";
    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
