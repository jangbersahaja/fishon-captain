import authOptions from "@/lib/auth";
import { getPayoutById } from "@/lib/services/finance-service";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayoutApproveButton } from "../../../_components/PayoutApproveButton";
import { PayoutCompleteButton } from "../../../_components/PayoutCompleteButton";
import { PayoutStatusBadge } from "../../../_components/PayoutStatusBadge";
export const dynamic = "force-dynamic";

interface PayoutDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}
//TODO(@fishon/packages): Move this to shared package if used in multiple apps
type PayoutStatus =
  | "PENDING"
  | "APPROVED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export default async function PayoutDetailPage({
  params,
}: PayoutDetailPageProps) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect(`/auth?mode=signin&next=/staff/finance/payouts/${id}`);
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Fetch payout details
  const payout = await getPayoutById(id);

  if (!payout) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Payout Details
          </h1>
          <p className="mt-1 font-mono text-sm text-slate-600">
            Batch ID: {payout.batchId}
          </p>
        </div>
        <Link
          href="/staff/finance/payouts"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Payouts
        </Link>
      </div>

      {/* Status & Actions */}
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <PayoutStatusBadge status={payout.status as PayoutStatus} />
        </div>
        {role === "ADMIN" && (
          <div className="space-y-2">
            <PayoutApproveButton payoutId={payout.id} status={payout.status} />
            <PayoutCompleteButton payoutId={payout.id} status={payout.status} />
          </div>
        )}
      </div>

      {/* Payout Information */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Captain Details */}
        <div className="p-6 bg-white border rounded-lg border-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Captain Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-600">Name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {payout.owner?.name || "Unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Email</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {payout.owner?.email || "N/A"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Owner ID</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">
                {payout.ownerId}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bank Details */}
        <div className="p-6 bg-white border rounded-lg border-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Bank Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-600">Bank Name</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">
                {payout.bankName}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Account Number</dt>
              <dd className="mt-1 font-mono text-sm text-slate-900">
                {payout.accountNumber}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Account Holder</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {payout.accountHolder}
              </dd>
            </div>
          </dl>
        </div>

        {/* Financial Details */}
        <div className="p-6 bg-white border rounded-lg border-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Financial Details
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-600">Total Earnings</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-900">
                RM {Number(payout.totalEarnings).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Deductions</dt>
              <dd className="mt-1 text-sm text-slate-900">
                RM {Number(payout.deductions).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Net Payout</dt>
              <dd className="mt-1 text-xl font-bold text-green-600">
                RM {Number(payout.netPayout).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Bookings</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {payout.bookingCount} booking(s)
              </dd>
            </div>
          </dl>
        </div>

        {/* Timeline */}
        <div className="p-6 bg-white border rounded-lg border-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Timeline
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-slate-600">Created</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(new Date(payout.createdAt), "PPP p")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Period</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {format(new Date(payout.periodStart), "PP")} -{" "}
                {format(new Date(payout.periodEnd), "PP")}
              </dd>
            </div>
            {payout.scheduledAt && (
              <div>
                <dt className="text-sm text-slate-600">Scheduled</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {format(new Date(payout.scheduledAt), "PPP p")}
                </dd>
              </div>
            )}
            {payout.processedAt && (
              <div>
                <dt className="text-sm text-slate-600">Processed</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {format(new Date(payout.processedAt), "PPP p")}
                </dd>
              </div>
            )}
            {payout.completedAt && (
              <div>
                <dt className="text-sm text-slate-600">Completed</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  {format(new Date(payout.completedAt), "PPP p")}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Transfer Reference */}
      {payout.transferReference && (
        <div className="p-6 border border-green-200 rounded-lg bg-green-50">
          <h2 className="mb-2 text-lg font-semibold text-green-900">
            Transfer Reference
          </h2>
          <p className="font-mono text-sm text-green-800">
            {payout.transferReference}
          </p>
        </div>
      )}

      {/* Failure Reason */}
      {payout.failureReason && (
        <div className="p-6 border border-red-200 rounded-lg bg-red-50">
          <h2 className="mb-2 text-lg font-semibold text-red-900">
            Failure Reason
          </h2>
          <p className="text-sm text-red-800">{payout.failureReason}</p>
        </div>
      )}

      {/* Booking IDs */}
      <div className="p-6 bg-white border rounded-lg border-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Included Bookings
        </h2>
        <div className="space-y-2">
          {payout.bookingIds.map((bookingId: string, index: number) => (
            <div
              key={bookingId}
              className="flex items-center justify-between p-3 border rounded-lg border-slate-100 hover:bg-slate-50"
            >
              <span className="text-sm text-slate-600">
                Booking #{index + 1}
              </span>
              <span className="font-mono text-sm text-slate-900">
                {bookingId}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Total: {payout.bookingIds.length} booking(s)
        </p>
      </div>
    </div>
  );
}
