import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { markPayoutCompleted } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/finance/payouts/[id]/complete
 * Mark a payout as completed with transfer reference
 * Admin only
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
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

    if (role !== "ADMIN") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      );
    }

    // Parse request body
    const body = await req.json();
    const { transferReference } = body;

    if (!transferReference || typeof transferReference !== "string") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Transfer reference is required" },
          { status: 400 }
        )
      );
    }

    // Mark payout as completed
    const payout = await markPayoutCompleted(id, transferReference, userId);

    logger.info("payout_completed", {
      payoutId: id,
      batchId: payout.batchId,
      completedBy: userId,
      transferReference,
      netPayout: Number(payout.netPayout),
      bookingCount: payout.bookingCount,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          batchId: payout.batchId,
          status: payout.status,
          completedAt: payout.completedAt,
          transferReference: payout.transferReference,
        },
      })
    );
  } catch (error) {
    logger.error("payout_complete_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to mark payout as completed",
        },
        { status: 500 }
      )
    );
  }
}
