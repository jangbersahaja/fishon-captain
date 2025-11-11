import authOptions from "@/lib/auth";
import {
  calculatePendingPayouts,
  getPayouts,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreatePayoutBatchButton } from "../../_components/CreatePayoutBatchButton";
import { PayoutTable } from "../../_components/PayoutTable";
import { PendingPayoutsTable } from "../../_components/PendingPayoutsTable";

export const dynamic = "force-dynamic";

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
  const totalCaptains = pendingCalculations.length;
  const totalBookings = pendingCalculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );

  // Filter calculations for captains with complete bank details
  const readyForPayout = pendingCalculations.filter(
    (c) => c.bankName && c.accountNumber && c.accountHolder
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Payout Queue
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Process captain earnings and manage payouts
          </p>
        </div>
        <Link
          href="/staff/finance"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <p className="text-sm text-slate-600">Pending Payout</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            RM {totalPending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {totalCaptains} captain(s), {totalBookings} booking(s)
          </p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <p className="text-sm text-slate-600">Ready for Payout</p>
          <p className="mt-1 text-2xl font-semibold text-green-600">
            {readyForPayout.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Captain(s) with complete bank details
          </p>
        </div>

        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <p className="text-sm text-slate-600">Incomplete Profiles</p>
          <p className="mt-1 text-2xl font-semibold text-amber-600">
            {totalCaptains - readyForPayout.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Missing bank information
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
              PAID bookings awaiting payout processing
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
              status: p.status as any,
              bankName: p.bankName,
              accountNumber: p.accountNumber,
              scheduledAt: p.scheduledAt,
              createdAt: p.createdAt,
            }))}
          />
        </div>
      )}

      {/* Help Text */}
      {role === "ADMIN" && (
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="font-medium text-blue-900">Admin Actions</h3>
          <ul className="mt-2 space-y-1 text-sm text-blue-800">
            <li>
              • Create payout batch to schedule payments for captains with
              complete bank details
            </li>
            <li>• Review and approve pending payouts before processing</li>
            <li>• Mark payouts as completed after confirming bank transfer</li>
          </ul>
        </div>
      )}
    </div>
  );
}
