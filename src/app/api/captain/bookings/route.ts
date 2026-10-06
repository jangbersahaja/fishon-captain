/**
 * GET /api/captain/bookings
 *
 * Returns the authenticated captain's bookings across all charters they own,
 * shaped for the Fishon mobile app.
 *
 * Query params:
 *   status - optional. Accepts the mobile camelCase enum value
 *            (e.g. "paymentAuthorized") OR the DB UPPER_SNAKE value
 *            (e.g. "PAYMENT_AUTHORIZED"). Comma-separated values are allowed.
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Data flow (cross-DB):
 *   Captain DB: resolve userId -> Charter.ownerId -> charterIds
 *   Market DB (read-only): bookings where charterId IN (charterIds)
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { toMobileBookingDto } from "@/lib/api/mobile-booking-dto";
import { getCaptainBookings } from "@/lib/booking-service";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Normalize a mobile/DB status value to the DB UPPER_SNAKE form for filtering. */
const MOBILE_TO_DB_STATUS: Record<string, string> = {
  pending: "PENDING",
  awaitingpayment: "AWAITING_PAYMENT",
  paymentauthorized: "PAYMENT_AUTHORIZED",
  paid: "PAID",
  completed: "COMPLETED",
  rejected: "REJECTED",
  expired: "EXPIRED",
  cancelled: "CANCELLED",
  underreview: "UNDER_REVIEW",
};

function normalizeStatus(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Already DB form (allow underscores + upper-casing).
  const upper = trimmed.toUpperCase();
  const dbValues = Object.values(MOBILE_TO_DB_STATUS);
  if (dbValues.includes(upper)) return upper;
  // Mobile camelCase form -> strip to lowercase key.
  const key = trimmed.toLowerCase().replace(/_/g, "");
  return MOBILE_TO_DB_STATUS[key] ?? null;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    // Resolve the charters this captain owns.
    const charters = await prisma.charter.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const charterIds = charters.map((c) => c.id);

    if (charterIds.length === 0) {
      return applySecurityHeaders(
        NextResponse.json({ bookings: [], total: 0 })
      );
    }

    // Parse optional status filter (comma-separated, mobile or DB form).
    const statusParam = req.nextUrl.searchParams.get("status");
    let statusFilter: Set<string> | null = null;
    if (statusParam) {
      const normalized = statusParam
        .split(",")
        .map(normalizeStatus)
        .filter((s): s is string => s !== null);
      if (normalized.length > 0) statusFilter = new Set(normalized);
    }

    const enriched = await getCaptainBookings(charterIds);

    const filtered = statusFilter
      ? enriched.filter((b) => statusFilter!.has(b.status))
      : enriched;

    // Resolve cover images for the charters in this result set in one query.
    const coverByCharter = await getCoverImages(
      Array.from(new Set(filtered.map((b) => b.charterId)))
    );

    const bookings = filtered.map((b) =>
      toMobileBookingDto(b, coverByCharter.get(b.charterId) ?? null)
    );

    return applySecurityHeaders(
      NextResponse.json({ bookings, total: bookings.length })
    );
  } catch (error) {
    console.error("[GET /api/captain/bookings] error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to load bookings" },
        { status: 500 }
      )
    );
  }
}

/**
 * Fetch the primary cover image (lowest sortOrder) per charter in one query.
 * Returns a map of charterId -> url.
 */
async function getCoverImages(
  charterIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (charterIds.length === 0) return result;

  const media = await prisma.charterMedia.findMany({
    where: { charterId: { in: charterIds } },
    select: { charterId: true, url: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const m of media) {
    if (m.charterId && !result.has(m.charterId)) {
      result.set(m.charterId, m.url);
    }
  }
  return result;
}
