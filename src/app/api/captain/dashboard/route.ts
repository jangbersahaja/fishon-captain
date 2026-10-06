/**
 * GET /api/captain/dashboard
 *
 * Returns the authenticated captain's dashboard summary (profile, booking
 * stats, earnings, priority bookings, charter performance, system messages),
 * flattened for the Fishon mobile app.
 *
 * Query params:
 *   period - optional, one of "7d" | "30d" | "90d" (default "30d").
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Wraps the existing getDashboardData() server function; no new DB logic.
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { toMobileDashboardDto } from "@/lib/api/mobile-dashboard-dto";
import {
  type DashboardPeriod,
  getDashboardData,
} from "@/lib/dashboard-service";
import { applySecurityHeaders } from "@/lib/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_PERIODS: DashboardPeriod[] = ["7d", "30d", "90d"];

function parsePeriod(raw: string | null): DashboardPeriod {
  if (raw && (VALID_PERIODS as string[]).includes(raw)) {
    return raw as DashboardPeriod;
  }
  return "30d";
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    const period = parsePeriod(req.nextUrl.searchParams.get("period"));
    const data = await getDashboardData(userId, period);
    const dto = toMobileDashboardDto(data);
    return applySecurityHeaders(NextResponse.json(dto));
  } catch (error) {
    console.error("[GET /api/captain/dashboard] error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to load dashboard" },
        { status: 500 }
      )
    );
  }
}
