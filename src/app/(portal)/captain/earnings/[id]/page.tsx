import authOptions from "@/lib/auth";
import {
  getBookingsFinancial,
  getPayoutById,
} from "@/lib/services/finance-service";
import { format } from "date-fns";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PayoutBookingList } from "../_components/PayoutBookingList";
import { PayoutTimeline } from "../_components/PayoutTimeline";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  const last4 = accountNumber.slice(-4);
  const masked = "*".repeat(accountNumber.length - 4);
  return `${masked}${last4}`;
}

function PayoutStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
  };

  const labels = {
    PENDING: "Pending",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
  };

  const color = colors[status as keyof typeof colors] || colors.PENDING;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {label}
    </span>
  );
}

export default async function PayoutDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(`/auth?mode=signin&next=/captain/earnings/${id}`);
  }

  // Fetch payout details
  const payout = await getPayoutById(id);

  if (!payout) {
    notFound();
  }

  // Verify ownership
  if (payout.ownerId !== session.user.id) {
    redirect("/captain/earnings");
  }

  // Fetch bookings included in this payout
  const bookings = await getBookingsFinancial({
    ownerId: session.user.id,
  });

  const payoutBookings = bookings.filter((b) =>
    payout.bookingIds.includes(b.id)
  );

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Header */}
      <div>
        <Link
          href="/captain/earnings"
          className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
        >
          ← Back to Earnings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Payment Details
        </h1>
        <p className="mt-1 font-mono text-sm text-slate-600">
          {payout.batchId}
        </p>
      </div>

      {/* Status & Amount */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-600">Payment Amount</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">
              RM {Number(payout.netPayout).toLocaleString()}
            </p>
            {Number(payout.deductions) > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                (RM {Number(payout.totalEarnings).toLocaleString()} - RM{" "}
                {Number(payout.deductions).toLocaleString()} deductions)
              </p>
            )}
          </div>
          <PayoutStatusBadge status={payout.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-600">Period</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {format(new Date(payout.periodStart), "MMM d")} -{" "}
              {format(new Date(payout.periodEnd), "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Bookings</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payout.bookingCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Bank</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {payout.bankName}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Account</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {maskAccountNumber(payout.accountNumber)}
            </p>
          </div>
        </div>

        {payout.transferReference && (
          <div className="pt-4 mt-4 border-t border-slate-200">
            <p className="text-xs text-slate-600">Transfer Reference</p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-900">
              {payout.transferReference}
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <PayoutTimeline payout={payout} />

      {/* Booking Breakdown */}
      <PayoutBookingList bookings={payoutBookings} />
    </div>
  );
}
