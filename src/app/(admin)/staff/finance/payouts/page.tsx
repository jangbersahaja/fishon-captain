import authOptions from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import {
  calculatePendingPayouts,
  getPayouts,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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

  // Fetch pending payout calculations
  const pendingCalculations = await calculatePendingPayouts();

  // Fetch recent payouts (last 20)
  const recentPayouts = await getPayouts({ limit: 20 });

  // Calculate totals
  const totalPending = pendingCalculations.reduce(
    (sum, c) => sum + c.totalEarnings,
    0
  );
  const totalBookings = pendingCalculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );

  // Count captains by bank status
  const captainsWithBank = pendingCalculations.filter(
    (c) => c.bankName && c.accountNumber && c.accountHolder
  ).length;
  const captainsMissingBank = pendingCalculations.length - captainsWithBank;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Payout Management
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Process captain earnings from paid bookings. Select captains and click
          &quot;Process Payout Now&quot; to create a payout batch.
        </p>
      </div>

      {/* Navigation */}
      <FinanceNav />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="p-4 border rounded-lg border-blue-200 bg-blue-50">
          <p className="text-sm text-blue-700">Total Pending</p>
          <p className="mt-1 text-2xl font-semibold text-blue-600">
            RM {totalPending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-blue-600">
            {totalBookings} booking(s)
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <p className="text-sm text-slate-600">Captains</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {pendingCalculations.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">with pending earnings</p>
        </div>

        <div className="p-4 border rounded-lg border-green-200 bg-green-50">
          <p className="text-sm text-green-700">Ready to Process</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            {captainsWithBank}
          </p>
          <p className="mt-1 text-xs text-green-600">bank details complete</p>
        </div>

        <div className="p-4 border rounded-lg border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-700">Needs Bank Info</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {captainsMissingBank}
          </p>
          <p className="mt-1 text-xs text-amber-600">missing bank details</p>
        </div>
      </div>

      {/* Pending Payouts Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Pending Payouts
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Select captains to process payout. Captains see a 3-5 day buffer
            message for payment gateway delays and verification.
          </p>
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
      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
        <h3 className="font-medium text-blue-900">Payout Processing Guide</h3>
        <ul className="mt-2 space-y-1 text-sm text-blue-800">
          <li>
            • <strong>Step 1:</strong> Select captains using checkboxes (only
            those with bank details can be selected)
          </li>
          <li>
            • <strong>Step 2:</strong> Click &quot;Process Payout Now&quot; to
            create a payout batch
          </li>
          <li>
            • <strong>Step 3:</strong> Review the payout detail page to adjust
            deductions if needed
          </li>
          <li>
            • <strong>Step 4:</strong> Approve the payout and complete the bank
            transfer
          </li>
        </ul>
        <p className="mt-3 text-xs text-blue-700">
          💡 <strong>Why 3-5 day buffer for captains?</strong> Payment gateway
          delays (money in transit), missing bank details verification, and
          fraud prevention checks.
        </p>
      </div>
    </div>
  );
}
