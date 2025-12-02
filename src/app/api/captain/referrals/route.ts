/**
 * Captain Referrals List API
 *
 * GET - Get list of referrals made by the captain
 */

import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { getReferralsByInvitor } from "@/lib/services/referral-service";
import type { ReferralStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/captain/referrals
 *
 * Get list of referrals for the authenticated captain
 *
 * Query params:
 * - status: Filter by status (all, PENDING, REGISTERED, etc.)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10, max: 50)
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Check for admin bypass
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const userId = getEffectiveUserId({ session, query });
    if (!userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      key: `referrals-list:${userId}`,
      max: 30,
      windowMs: 60000,
    }); // 30 requests per minute
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate status
    const validStatuses = [
      "all",
      "PENDING",
      "REGISTERED",
      "CHARTER_CREATED",
      "FIRST_BOOKING",
      "COMPLETED",
      "PAID",
      "EXPIRED",
      "INVALID",
    ];
    if (!validStatuses.includes(status)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid status filter" }, { status: 400 })
      );
    }

    // Get referrals
    const result = await getReferralsByInvitor({
      invitorId: userId,
      status: status as ReferralStatus | "all",
      page,
      limit,
    });

    // Transform for API response (mask emails)
    const referrals = result.referrals.map((ref) => ({
      id: ref.id,
      inviteeName:
        ref.invitee?.captainProfile?.displayName || ref.invitee?.name || null,
      inviteeEmail: ref.inviteeEmail ? maskEmail(ref.inviteeEmail) : null,
      status: ref.status,
      clickedAt: ref.clickedAt,
      registeredAt: ref.registeredAt,
      firstCharterAt: ref.firstCharterAt,
      completedAt: ref.completedAt,
      expiresAt: ref.expiresAt,
      earning: ref.earning
        ? {
            amount: Number(ref.earning.commissionAmount),
            status: ref.earning.status,
            earnedAt: ref.earning.earnedAt,
          }
        : null,
    }));

    return applySecurityHeaders(
      NextResponse.json({
        referrals,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        summary: result.summary,
      })
    );
  } catch (error) {
    console.error("[Referrals List GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

/**
 * Mask email for privacy (show first char + domain)
 * Example: john.doe@email.com → j***@email.com
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***";
  return `${local.charAt(0)}***@${domain}`;
}
