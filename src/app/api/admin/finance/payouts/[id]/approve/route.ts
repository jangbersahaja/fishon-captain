import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { approvePayout } from "@/lib/services/finance-service";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/admin-middleware";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/finance/payouts/[id]/approve
 * Approve a pending payout
 * Admin only
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth check
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    // Approve payout
    const payout = await approvePayout(id, authResult.userId);

    logger.info("payout_approved", {
      payoutId: id,
      batchId: payout.batchId,
      approvedBy: authResult.userId,
      netPayout: Number(payout.netPayout),
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          batchId: payout.batchId,
          status: payout.status,
          scheduledAt: payout.scheduledAt,
        },
      })
    );
  } catch (error) {
    logger.error("payout_approve_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to approve payout",
        },
        { status: 500 }
      )
    );
  }
}
