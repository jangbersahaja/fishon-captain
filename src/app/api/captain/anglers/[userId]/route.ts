/**
 * GET /api/captain/anglers/:userId
 *
 * Returns a small, non-PII angler profile for display to captains (e.g. on a
 * booking detail). Only safe fields are returned.
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Data source: market DB (read-only) — MarketUser + COMPLETED booking count.
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { applySecurityHeaders } from "@/lib/headers";
import { prismaMarket } from "@/lib/prisma-market";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;

  const { userId } = await params;

  try {
    const user = await prismaMarket.marketUser.findUnique({
      where: { id: userId },
      select: { name: true, image: true, createdAt: true },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Angler not found" }, { status: 404 })
      );
    }

    const completedTrips = await prismaMarket.booking.count({
      where: { userId, status: "COMPLETED" },
    });

    return applySecurityHeaders(
      NextResponse.json({
        name: user.name ?? "Angler",
        avatarUrl: user.image ?? null,
        memberSince:
          user.createdAt instanceof Date
            ? user.createdAt.toISOString()
            : user.createdAt ?? null,
        completedTrips,
      })
    );
  } catch (error) {
    console.error(`[GET /api/captain/anglers/${userId}] error:`, error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to load angler profile" },
        { status: 500 }
      )
    );
  }
}
