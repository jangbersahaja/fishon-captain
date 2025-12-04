import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/server/audit";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/finance/payouts/[id]/deductions
 * Update deductions for a payout (PENDING status only)
 * Staff and Admin can update
 */
export async function PATCH(
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

    // Parse request body
    const body = await req.json();
    const { deductions } = body;

    if (typeof deductions !== "number" || deductions < 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid deductions amount" },
          { status: 400 }
        )
      );
    }

    // Fetch current payout
    const payout = await prisma.payout.findUnique({
      where: { id },
    });

    if (!payout) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Payout not found" }, { status: 404 })
      );
    }

    // Only allow updates for PENDING status
    if (payout.status !== "PENDING") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Deductions can only be updated for PENDING payouts" },
          { status: 400 }
        )
      );
    }

    // Validate deductions don't exceed total earnings
    const totalEarnings = Number(payout.totalEarnings);
    if (deductions >= totalEarnings) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Deductions cannot exceed total earnings" },
          { status: 400 }
        )
      );
    }

    // Calculate new net payout
    const netPayout = totalEarnings - deductions;

    // Update payout
    const updated = await prisma.payout.update({
      where: { id },
      data: {
        deductions,
        netPayout,
      },
    });

    // Audit log
    await writeAuditLog({
      actorUserId: userId,
      entityType: "payout",
      entityId: id,
      action: "payout_deductions_updated",
      before: { deductions: Number(payout.deductions), netPayout: Number(payout.netPayout) },
      after: { deductions, netPayout },
    });

    logger.info("payout_deductions_updated", {
      payoutId: id,
      previousDeductions: Number(payout.deductions),
      newDeductions: deductions,
      netPayout,
      updatedBy: userId,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        payout: updated,
      })
    );
  } catch (error) {
    logger.error("payout_deductions_update_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update deductions" },
        { status: 500 }
      )
    );
  }
}
