import { authOptions } from "@/lib/auth";
import {
  getDailyRevenue,
  getRevenueComparison,
} from "@/lib/services/finance-service";
import { parseISO } from "date-fns";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/finance/stats
 *
 * Returns comprehensive finance statistics with period comparison
 *
 * Query params:
 * - startDate: ISO date string for period start
 * - endDate: ISO date string for period end
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role authorization (STAFF or ADMIN only)
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "STAFF" && userRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "Missing required parameters: startDate, endDate" },
        { status: 400 }
      );
    }

    const startDate = parseISO(startDateParam);
    const endDate = parseISO(endDateParam);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO 8601 format." },
        { status: 400 }
      );
    }

    // Fetch comparison statistics
    const comparison = await getRevenueComparison(startDate, endDate);

    // Fetch daily revenue for chart
    const dailyRevenue = await getDailyRevenue(startDate, endDate);

    return NextResponse.json({
      comparison,
      dailyRevenue,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching finance stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch finance statistics" },
      { status: 500 }
    );
  }
}
