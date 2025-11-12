import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { createPayoutBatch } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/finance/payouts/batch
 * Create a new payout batch from pending calculations
 * Admin only
 */
export async function POST(req: NextRequest) {
  try {
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
    const { calculations } = body;

    if (!calculations || !Array.isArray(calculations)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid request - calculations array required" },
          { status: 400 }
        )
      );
    }

    if (calculations.length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "No calculations provided" },
          { status: 400 }
        )
      );
    }

    // Validate each calculation has required fields
    for (const calc of calculations) {
      if (
        !calc.ownerId ||
        !calc.totalEarnings ||
        !calc.bookingIds ||
        !Array.isArray(calc.bookingIds)
      ) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Invalid calculation data" },
            { status: 400 }
          )
        );
      }

      // Verify bank details present
      if (!calc.bankName || !calc.accountNumber || !calc.accountHolder) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: `Missing bank details for captain ${calc.ownerName || calc.ownerId}`,
            },
            { status: 400 }
          )
        );
      }
    }

    // Set period dates (current month)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Create payout batch
    const result = await createPayoutBatch(
      calculations,
      userId,
      periodStart,
      periodEnd
    );

    logger.info("payout_batch_created", {
      batchId: result.batchId,
      payoutCount: result.payouts.length,
      totalAmount: calculations.reduce(
        (sum: number, c: { totalEarnings: number }) => sum + c.totalEarnings,
        0
      ),
      createdBy: userId,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        batchId: result.batchId,
        payoutCount: result.payouts.length,
        payouts: result.payouts,
      })
    );
  } catch (error) {
    logger.error("payout_batch_create_error", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to create batch",
        },
        { status: 500 }
      )
    );
  }
}
