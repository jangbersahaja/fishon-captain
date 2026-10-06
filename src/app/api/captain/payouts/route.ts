/**
 * GET /api/captain/payouts
 *
 * Returns the authenticated captain's payout history, shaped for the Fishon
 * mobile app. Sensitive/admin-only fields (bank account snapshot, staff/admin
 * audit IDs) are intentionally excluded.
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Wraps the existing getCaptainPayoutHistory() server function (which returns
 * RAW Payout rows) and whitelists fields before returning them.
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { applySecurityHeaders } from "@/lib/headers";
import { getCaptainPayoutHistory } from "@/lib/services/finance-service";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    const payouts = await getCaptainPayoutHistory(userId);

    // Whitelist: never expose accountNumber/accountHolder/bankName/createdBy/
    // approvedBy to the captain client.
    const result = payouts.map((p) => ({
      id: p.id,
      batchId: p.batchId,
      periodStart: toIso(p.periodStart),
      periodEnd: toIso(p.periodEnd),
      totalEarnings: Number(p.totalEarnings),
      deductions: Number(p.deductions),
      netPayout: Number(p.netPayout),
      bookingCount: p.bookingCount,
      status: p.status,
      transferReference: p.transferReference ?? null,
      scheduledAt: toIso(p.scheduledAt),
      processedAt: toIso(p.processedAt),
      completedAt: toIso(p.completedAt),
      createdAt: toIso(p.createdAt),
    }));

    return applySecurityHeaders(NextResponse.json({ payouts: result }));
  } catch (error) {
    console.error("[GET /api/captain/payouts] error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to load payouts" }, { status: 500 })
    );
  }
}
