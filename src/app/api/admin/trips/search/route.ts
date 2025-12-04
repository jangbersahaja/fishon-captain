/**
 * Admin Trip Search API
 *
 * GET /api/admin/trips/search?q=<query>&charterId=<charterId>
 *
 * Returns trips matching the search query by name, trip type, or charter name.
 * Used for admin/staff tools like promo code trip restrictions.
 */

import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface TripSearchResult {
  id: string;
  name: string;
  tripType: string;
  price: number;
  durationHours: number;
  charterName: string;
  charterLocation: string;
  charterId: string;
}

/**
 * GET /api/admin/trips/search
 * Search trips by name, type, or charter name
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const charterId = searchParams.get("charterId")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    // Build where clause
    const where: Record<string, unknown> = {
      charter: {
        isActive: true,
      },
    };

    // Filter by charterId if provided
    if (charterId) {
      where.charterId = charterId;
    }

    if (query) {
      where.OR = [
        // Support exact ID lookup for loading selected items
        { id: query },
        { name: { contains: query, mode: "insensitive" } },
        { tripType: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        {
          charter: {
            name: { contains: query, mode: "insensitive" },
          },
        },
        {
          charter: {
            city: { contains: query, mode: "insensitive" },
          },
        },
        {
          charter: {
            state: { contains: query, mode: "insensitive" },
          },
        },
      ];
    }

    const trips = await prisma.trip.findMany({
      where,
      take: limit,
      orderBy: [{ charter: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        tripType: true,
        price: true,
        durationHours: true,
        charter: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
          },
        },
      },
    });

    const results: TripSearchResult[] = trips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      tripType: trip.tripType,
      price: Number(trip.price),
      durationHours: trip.durationHours,
      charterName: trip.charter.name,
      charterLocation: `${trip.charter.city}, ${trip.charter.state}`,
      charterId: trip.charter.id,
    }));

    return NextResponse.json({ trips: results });
  } catch (error) {
    console.error("[TripSearchAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to search trips" },
      { status: 500 }
    );
  }
}
