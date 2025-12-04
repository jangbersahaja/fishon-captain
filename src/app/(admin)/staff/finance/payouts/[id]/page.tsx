import authOptions from "@/lib/auth";
import { decrypt } from "@/lib/encryption";
import { getPayoutById } from "@/lib/services/finance-service";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayoutApproveButton } from "../../../_components/PayoutApproveButton";
import { PayoutCancelButton } from "../../../_components/PayoutCancelButton";
import { PayoutCompleteButton } from "../../../_components/PayoutCompleteButton";
import { PayoutDeductionForm } from "../../../_components/PayoutDeductionForm";
import { PayoutStatusBadge } from "../../../_components/PayoutStatusBadge";

export const dynamic = "force-dynamic";

interface PayoutDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Safely decrypt a string, returning the original on failure
 * Handles both encrypted data and plain text (for backwards compatibility)
 */
function safeDecrypt(value: string | null): string | null {
  if (!value) return null;
  try {
    return decrypt(value);
  } catch {
    return value;
  }
}

type PayoutStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect(`/auth?mode=signin&next=/staff/finance/payouts/${id}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const payout = await getPayoutById(id);

  if (!payout) {
    notFound();
  }

  const decryptedAccountNumber = safeDecrypt(payout.accountNumber);
  const decryptedAccountHolder = safeDecrypt(payout.accountHolder);

  const isCompleted = payout.status === "COMPLETED";
  const isCancelled = payout.status === "CANCELLED";
  const isPending = payout.status === "PENDING";
  const isApproved =
    payout.status === "APPROVED" || payout.status === "PROCESSING";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/staff/finance/payouts"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Payouts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Payout Details
          </h1>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {payout.batchId}
          </p>
        </div>
        <PayoutStatusBadge status={payout.status as PayoutStatus} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Details (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Payout Summary Card */}
          <div className="p-6 border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">
                  Net Payout Amount
                </p>
                <p className="mt-1 text-4xl font-bold text-green-600">
                  RM {Number(payout.netPayout).toLocaleString()}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-green-700">
                  <span>
                    Earnings: RM {Number(payout.totalEarnings).toLocaleString()}
                  </span>
                  {Number(payout.deductions) > 0 && (
                    <span>
                      − Deductions: RM{" "}
                      {Number(payout.deductions).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-700">
                  {payout.bookingCount} booking(s)
                </p>
                <p className="mt-1 text-xs text-green-600">
                  {format(new Date(payout.periodStart), "PP")} -{" "}
                  {format(new Date(payout.periodEnd), "PP")}
                </p>
              </div>
            </div>
          </div>

          {/* Captain & Bank Details */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Captain Details */}
            <div className="p-5 bg-white border rounded-lg border-slate-200">
              <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-slate-500">
                Captain
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-medium text-slate-900">
                    {payout.owner?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-slate-600">
                    {payout.owner?.email || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bank Details */}
            <div className="p-5 bg-white border rounded-lg border-slate-200">
              <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-slate-500">
                Bank Account
              </h2>
              <div className="space-y-2">
                <p className="text-lg font-medium text-slate-900">
                  {payout.bankName}
                </p>
                <p className="font-mono text-sm text-slate-700">
                  {decryptedAccountNumber}
                </p>
                <p className="text-sm text-slate-600">
                  {decryptedAccountHolder}
                </p>
              </div>
            </div>
          </div>

          {/* Transfer Reference (if completed) */}
          {payout.transferReference && (
            <div className="p-5 border border-green-200 rounded-lg bg-green-50">
              <h2 className="mb-2 text-sm font-semibold tracking-wide text-green-800 uppercase">
                Transfer Reference
              </h2>
              <p className="font-mono text-lg text-green-700">
                {payout.transferReference}
              </p>
              {payout.completedAt && (
                <p className="mt-2 text-sm text-green-600">
                  Completed on{" "}
                  {format(new Date(payout.completedAt), "PPP 'at' p")}
                </p>
              )}
            </div>
          )}

          {/* Failure/Cancellation Reason */}
          {payout.failureReason && (
            <div
              className={`p-5 border rounded-lg ${isCancelled ? "border-slate-300 bg-slate-50" : "border-red-200 bg-red-50"}`}
            >
              <h2
                className={`mb-2 text-sm font-semibold uppercase tracking-wide ${isCancelled ? "text-slate-700" : "text-red-800"}`}
              >
                {isCancelled ? "Cancellation Reason" : "Failure Reason"}
              </h2>
              <p
                className={`text-sm ${isCancelled ? "text-slate-600" : "text-red-700"}`}
              >
                {payout.failureReason}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="p-5 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-slate-500">
              Timeline
            </h2>
            <div className="space-y-3">
              <TimelineItem label="Created" date={payout.createdAt} isActive />
              {payout.scheduledAt && (
                <TimelineItem
                  label="Approved"
                  date={payout.scheduledAt}
                  isActive
                />
              )}
              {payout.processedAt && (
                <TimelineItem
                  label="Processing"
                  date={payout.processedAt}
                  isActive
                />
              )}
              {payout.completedAt && (
                <TimelineItem
                  label="Completed"
                  date={payout.completedAt}
                  isActive
                  isLast
                />
              )}
            </div>
          </div>

          {/* Included Bookings */}
          <div className="p-5 bg-white border rounded-lg border-slate-200">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-slate-500">
              Included Bookings ({payout.bookingIds.length})
            </h2>
            <div className="space-y-2 overflow-y-auto max-h-64">
              {payout.bookingIds.map((bookingId: string, index: number) => (
                <div
                  key={bookingId}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
                >
                  <span className="text-sm text-slate-500">#{index + 1}</span>
                  <span className="font-mono text-xs text-slate-700">
                    {bookingId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Actions (1 col) */}
        <div className="space-y-6">
          {/* Action Panel */}
          <div className="sticky p-5 bg-white border rounded-lg border-slate-200 top-6">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase text-slate-500">
              Actions
            </h2>

            {/* Workflow Steps */}
            <div className="space-y-4">
              {/* Step 1: Adjust Deductions (PENDING only) */}
              {isPending && (
                <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-blue-600 rounded-full">
                      1
                    </span>
                    <h3 className="font-medium text-blue-900">
                      Adjust Deductions
                    </h3>
                  </div>
                  <PayoutDeductionForm
                    payoutId={payout.id}
                    currentDeductions={Number(payout.deductions)}
                    totalEarnings={Number(payout.totalEarnings)}
                    status={payout.status}
                  />
                </div>
              )}

              {/* Step 2: Approve (PENDING, Admin only) */}
              {isPending && role === "ADMIN" && (
                <div className="p-4 border rounded-lg border-slate-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full text-slate-500 bg-slate-200">
                      2
                    </span>
                    <h3 className="font-medium text-slate-700">
                      Approve Payout
                    </h3>
                  </div>
                  <p className="mb-3 text-xs text-slate-500">
                    Confirm the amounts are correct before approving.
                  </p>
                  <PayoutApproveButton
                    payoutId={payout.id}
                    status={payout.status}
                  />
                </div>
              )}

              {/* Step 3: Complete with Transfer Reference (APPROVED/PROCESSING, Admin only) */}
              {isApproved && role === "ADMIN" && (
                <div className="p-4 border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-green-600 rounded-full">
                      ✓
                    </span>
                    <h3 className="font-medium text-green-900">
                      Complete Transfer
                    </h3>
                  </div>
                  <p className="mb-3 text-xs text-green-700">
                    Enter the bank transfer reference after making the payment.
                  </p>
                  <PayoutCompleteButton
                    payoutId={payout.id}
                    status={payout.status}
                  />
                </div>
              )}

              {/* Completed State */}
              {isCompleted && (
                <div className="p-4 text-center border border-green-200 rounded-lg bg-green-50">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 text-green-600 bg-green-100 rounded-full">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="font-medium text-green-900">Payout Completed</p>
                  <p className="mt-1 text-sm text-green-700">
                    Transfer has been processed successfully.
                  </p>
                </div>
              )}

              {/* Cancelled State */}
              {isCancelled && (
                <div className="p-4 text-center border rounded-lg border-slate-300 bg-slate-50">
                  <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-full text-slate-500 bg-slate-200">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <p className="font-medium text-slate-700">Payout Cancelled</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Bookings have been reset to pending.
                  </p>
                </div>
              )}

              {/* Cancel Button (PENDING or APPROVED only) */}
              {(isPending || isApproved) && (
                <div className="pt-4 border-t border-slate-200">
                  <PayoutCancelButton
                    payoutId={payout.id}
                    status={payout.status}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  date,
  isActive,
  isLast = false,
}: {
  label: string;
  date: Date;
  isActive?: boolean;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="relative flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full ${
            isActive ? "bg-green-500" : "bg-slate-300"
          }`}
        />
        {!isLast && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
      </div>
      <div className="flex-1 pb-4">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500">
          {format(new Date(date), "PPP 'at' p")}
        </p>
      </div>
    </div>
  );
}
