/**
 * Admin Pricing API
 *
 * GET /api/admin/pricing - Fetch all trip pricing data with statistics
 */

import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all trips with charter information
    const trips = await prisma.trip.findMany({
      include: {
        charter: {
          select: {
            id: true,
            name: true,
            state: true,
            city: true,
            isActive: true,
          },
        },
      },
      where: {
        charter: {
          isActive: true,
        },
      },
      orderBy: [{ charter: { name: "asc" } }, { name: "asc" }],
    });

    // Calculate statistics
    const totalTrips = trips.length;
    const tripsWithPromo = trips.filter((t) => t.promoPrice !== null);

    const avgBasePrice =
      trips.reduce((sum, t) => sum + Number(t.price), 0) / totalTrips || 0;

    const avgPromoPrice =
      tripsWithPromo.length > 0
        ? tripsWithPromo.reduce((sum, t) => sum + Number(t.promoPrice!), 0) /
          tripsWithPromo.length
        : 0;

    const promoAdoptionRate = (tripsWithPromo.length / totalTrips) * 100 || 0;

    const prices = trips.map((t) => Number(t.price));
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };

    // Format trip data
    const formattedTrips = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      tripType: trip.tripType,
      durationHours: trip.durationHours,
      basePrice: Number(trip.price),
      minPrice: trip.promoPrice ? Number(trip.promoPrice) : null, // Semantic: captain's minimum
      currentPrice: trip.priceOverride ? Number(trip.priceOverride) : null, // Admin's active override
      charter: {
        id: trip.charter.id,
        name: trip.charter.name,
        state: trip.charter.state,
        city: trip.charter.city,
      },
    }));

    return NextResponse.json({
      stats: {
        totalTrips,
        avgBasePrice: Math.round(avgBasePrice * 100) / 100,
        avgPromoPrice:
          avgPromoPrice > 0 ? Math.round(avgPromoPrice * 100) / 100 : 0,
        promoAdoptionRate: Math.round(promoAdoptionRate * 100) / 100,
        priceRange,
      },
      trips: formattedTrips,
    });
  } catch (error) {
    console.error("[PricingAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing data" },
      { status: 500 }
    );
  }
}
