import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { cancelPayout } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/finance/payouts/[id]/cancel
 * Cancel a payout batch (PENDING or APPROVED status only)
 * Resets associated bookings back to PENDING payout status
 * Staff and Admin can cancel
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth check
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    const userId = session?.user?.id;

    if (!session?.user || !userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    if (role !== "STAFF" && role !== "ADMIN") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Forbidden - Staff access required" },
          { status: 403 }
        )
      );
    }

    // Parse optional reason from body
    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
    } catch {
      // No body or invalid JSON - that's fine, reason is optional
    }

    // Cancel the payout
    const result = await cancelPayout(id, userId, reason);

    logger.info("payout_cancelled", {
      payoutId: id,
      batchId: result.batchId,
      cancelledBy: userId,
      reason: reason || "No reason provided",
      bookingsReset: result.bookingIds.length,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        payout: result,
        message: `Payout cancelled. ${result.bookingIds.length} booking(s) reset to PENDING.`,
      })
    );
  } catch (error) {
    logger.error("payout_cancel_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to cancel payout",
        },
        { status: 500 }
      )
    );
  }
}
