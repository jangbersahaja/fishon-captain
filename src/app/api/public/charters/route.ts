/**
 * Public API endpoint for reading charter data
 * This endpoint is designed to be consumed by fishon-market frontend
 *
 * Authentication: Optional API key via Authorization header
 * Rate limiting: Consider implementing rate limiting for production
 */

import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Type for the v_public_charters view result
interface PublicCharterView {
  id: string;
  name: string;
  charterType: string;
  state: string;
  district: string;
  startingPoint: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  pricingPlan: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  captain: Record<string, unknown>;
  boat: Record<string, unknown> | null;
  trips: unknown[];
  amenities: unknown[];
  features: unknown[];
  media: unknown[];
  pickup: Record<string, unknown> | null;
  policies: Record<string, unknown> | null;
}

/**
 * Verify API key if provided
 */
function verifyApiKey(req: NextRequest): boolean {
  const apiKey = process.env.FISHON_CAPTAIN_API_KEY;

  // If no API key is configured, allow all requests
  if (!apiKey) {
    return true;
  }

  // Check Authorization header
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return false;
  }

  // Expected format: "Bearer <api_key>"
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== apiKey) {
    return false;
  }

  return true;
}

/**
 * GET /api/public/charters
 *
 * Query parameters:
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
 * - state: string (filter by state)
 * - charterType: string (filter by charter type)
 * - minPrice: number (filter trips by minimum price)
 * - maxPrice: number (filter trips by maximum price)
 */
export async function GET(req: NextRequest) {
  // Verify API key if configured
  if (!verifyApiKey(req)) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "unauthorized", message: "Invalid or missing API key" },
        { status: 401 }
      )
    );
  }

  try {
    const { searchParams } = new URL(req.url);

    // Parse query parameters
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const state = searchParams.get("state");
    const charterType = searchParams.get("charterType");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Build WHERE clause for filters
    const filters: string[] = [];
    const params: unknown[] = [];
    let paramCount = 1;

    if (state) {
      filters.push(`state = $${paramCount}`);
      params.push(state);
      paramCount++;
    }

    if (charterType) {
      filters.push(`"charterType" = $${paramCount}`);
      params.push(charterType);
      paramCount++;
    }

    // Note: Price filtering requires JSON querying which is complex
    // For now, we'll filter on the backend after fetching

    const whereClause =
      filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

    // Query the view
    const query = `
      SELECT * FROM v_public_charters
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const charters = await prisma.$queryRawUnsafe<PublicCharterView[]>(
      query,
      ...params
    );

    // Apply price filtering if needed (post-processing)
    let filteredCharters = charters;
    if (minPrice || maxPrice) {
      filteredCharters = charters.filter((charter) => {
        const trips = charter.trips as Array<{ price: number }>;
        return trips.some((trip) => {
          const price = trip.price;
          if (minPrice && price < parseFloat(minPrice)) return false;
          if (maxPrice && price > parseFloat(maxPrice)) return false;
          return true;
        });
      });
    }

    return applySecurityHeaders(
      NextResponse.json(
        {
          charters: filteredCharters,
          meta: {
            limit,
            offset,
            count: filteredCharters.length,
          },
        },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    );
  } catch (error) {
    console.error("Error fetching public charters:", error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "internal_error",
          message: "Failed to fetch charters",
        },
        { status: 500 }
      )
    );
  }
}
