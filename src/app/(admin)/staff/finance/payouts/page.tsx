import authOptions from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import {
  calculatePendingPayouts,
  getPayouts,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CreatePayoutBatchButton } from "../../_components/CreatePayoutBatchButton";
import { PayoutTable } from "../../_components/PayoutTable";
import { PendingPayoutsTable } from "../../_components/PendingPayoutsTable";
import { FinanceNav } from "../_components/FinanceNav";

export const dynamic = "force-dynamic";

/**
 * Safely decrypt a string, returning the original on failure
 */
function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return value; // Return original if decryption fails
  }
}

export default async function PayoutsQueuePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/finance/payouts");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Fetch pending payout calculations (now includes eligibility tracking)
  const pendingCalculations = await calculatePendingPayouts();

  // Fetch recent payouts (last 20)
  const recentPayouts = await getPayouts({ limit: 20 });

  // Calculate totals - now tracking eligible vs pending
  const totalEligible = pendingCalculations.reduce(
    (sum, c) => sum + c.eligibleEarnings,
    0
  );
  const totalPending = pendingCalculations.reduce(
    (sum, c) => sum + c.totalEarnings,
    0
  );
  const totalCaptains = pendingCalculations.length;
  const totalBookings = pendingCalculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );
  const eligibleBookings = pendingCalculations.reduce(
    (sum, c) => sum + c.eligibleBookingCount,
    0
  );

  // Filter calculations for captains with complete bank details AND eligible earnings
  const readyForPayout = pendingCalculations.filter(
    (c) =>
      c.bankName && c.accountNumber && c.accountHolder && c.eligibleEarnings > 0
  );

  // Captains with eligible earnings but missing bank details
  const missingBankDetails = pendingCalculations.filter(
    (c) =>
      (!c.bankName || !c.accountNumber || !c.accountHolder) &&
      c.eligibleEarnings > 0
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Finance Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Process captain earnings after trip completion (3-5 business day
          buffer)
        </p>
      </div>

      {/* Navigation */}
      <FinanceNav />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <p className="text-sm text-slate-600">Eligible for Payout</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            RM {totalEligible.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {eligibleBookings} booking(s) past 3-day buffer
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <p className="text-sm text-slate-600">Total Pending</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            RM {totalPending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalCaptains} captain(s), {totalBookings} booking(s)
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <p className="text-sm text-slate-600">Ready for Payout</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            {readyForPayout.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Eligible + bank details complete
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <p className="text-sm text-slate-600">Action Required</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {missingBankDetails.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Eligible but missing bank info
          </p>
        </div>
      </div>

      {/* Pending Payouts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pending Payouts
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              COMPLETED trips awaiting payout processing
            </p>
          </div>
          {role === "ADMIN" && readyForPayout.length > 0 && (
            <CreatePayoutBatchButton calculations={readyForPayout} />
          )}
        </div>

        <PendingPayoutsTable calculations={pendingCalculations} />
      </div>

      {/* Recent Payouts Section */}
      {recentPayouts.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent Payouts
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Last 20 payout batches
            </p>
          </div>

          <PayoutTable
            payouts={recentPayouts.map((p) => ({
              id: p.id,
              batchId: p.batchId,
              ownerId: p.ownerId,
              ownerName: p.owner?.name || "Unknown",
              ownerEmail: p.owner?.email || "",
              bookingCount: p.bookingCount,
              netPayout: Number(p.netPayout),
              status: (p.status || "PENDING").toUpperCase() as
                | "PENDING"
                | "APPROVED"
                | "PROCESSING"
                | "COMPLETED"
                | "FAILED"
                | "CANCELLED",
              bankName: p.bankName ?? null,
              accountNumber: safeDecrypt(p.accountNumber),
              scheduledAt: p.scheduledAt,
              createdAt: p.createdAt,
            }))}
          />
        </div>
      )}

      {/* Help Text */}
      {role === "ADMIN" && (
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="font-medium text-blue-900">
            Payout Policy (Startup Phase)
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>
              • <strong>Eligibility:</strong> Bookings become eligible 3
              business days after trip completion
            </li>
            <li>
              • <strong>Processing:</strong> Weekly manual batch processing
              (every Monday recommended)
            </li>
            <li>
              • <strong>Ready status:</strong> Captain must have eligible
              earnings + complete bank details
            </li>
            <li>
              • <strong>Disputes:</strong> Hold payout if complaint filed within
              72h of trip
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
