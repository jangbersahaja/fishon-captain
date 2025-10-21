/**
 * Public API endpoint for searching charters
 * This endpoint is designed to be consumed by fishon-market frontend
 *
 * Authentication: Optional API key via Authorization header
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
 * GET /api/public/charters/search
 *
 * Query parameters:
 * - location: string (searches in state, district, or starting point)
 * - charterType: string (exact match)
 * - technique: string (searches in trip techniques)
 * - minPrice: number (filter trips by minimum price)
 * - maxPrice: number (filter trips by maximum price)
 * - limit: number (default: 50, max: 100)
 * - offset: number (default: 0)
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
    const location = searchParams.get("location");
    const charterType = searchParams.get("charterType");
    const technique = searchParams.get("technique");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");

    // Fetch all active charters from view
    const charters = await prisma.$queryRaw<PublicCharterView[]>`
      SELECT * FROM v_public_charters
      ORDER BY "createdAt" DESC
    `;

    // Apply filters
    let filteredCharters = charters;

    // Location filter (search in state, district, or starting point)
    if (location) {
      const locationLower = location.toLowerCase();
      filteredCharters = filteredCharters.filter((charter) => {
        return (
          charter.state.toLowerCase().includes(locationLower) ||
          charter.district.toLowerCase().includes(locationLower) ||
          charter.startingPoint.toLowerCase().includes(locationLower)
        );
      });
    }

    // Charter type filter
    if (charterType) {
      filteredCharters = filteredCharters.filter(
        (charter) => charter.charterType === charterType
      );
    }

    // Technique filter (check if any trip has this technique)
    if (technique) {
      filteredCharters = filteredCharters.filter((charter) => {
        const trips = charter.trips as Array<{
          techniques?: Array<{ value: string }>;
        }>;
        return trips.some((trip) =>
          trip.techniques?.some((t) =>
            t.value.toLowerCase().includes(technique.toLowerCase())
          )
        );
      });
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filteredCharters = filteredCharters.filter((charter) => {
        const trips = charter.trips as Array<{ price: number }>;
        return trips.some((trip) => {
          const price = trip.price;
          if (minPrice && price < parseFloat(minPrice)) return false;
          if (maxPrice && price > parseFloat(maxPrice)) return false;
          return true;
        });
      });
    }

    // Apply pagination
    const paginatedCharters = filteredCharters.slice(offset, offset + limit);

    return applySecurityHeaders(
      NextResponse.json(
        {
          charters: paginatedCharters,
          meta: {
            limit,
            offset,
            count: paginatedCharters.length,
            total: filteredCharters.length,
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
    console.error("Error searching charters:", error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "internal_error",
          message: "Failed to search charters",
        },
        { status: 500 }
      )
    );
  }
}
