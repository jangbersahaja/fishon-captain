/**
 * Public API endpoint for reading a single charter by ID
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
 * GET /api/public/charters/[id]
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
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
    const { id } = await ctx.params;

    // Query the view for specific charter
    const charters = await prisma.$queryRaw<PublicCharterView[]>`
      SELECT * FROM v_public_charters
      WHERE id = ${id}
      LIMIT 1
    `;

    if (charters.length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "not_found", message: "Charter not found" },
          { status: 404 }
        )
      );
    }

    return applySecurityHeaders(
      NextResponse.json(
        { charter: charters[0] },
        {
          status: 200,
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      )
    );
  } catch (error) {
    console.error("Error fetching charter:", error);
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "internal_error",
          message: "Failed to fetch charter",
        },
        { status: 500 }
      )
    );
  }
}
