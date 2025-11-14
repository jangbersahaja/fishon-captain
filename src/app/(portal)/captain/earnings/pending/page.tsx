import authOptions from "@/lib/auth";
import { getCaptainBookings } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PendingBookingsTable } from "../_components/PendingBookingsTable";

export const dynamic = "force-dynamic";

export default async function PendingBookingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/earnings/pending");
  }

  // Fetch pending bookings
  const bookings = await getCaptainBookings(session.user.id, {
    payoutStatus: "PENDING",
  });

  const totalPendingEarnings = bookings.reduce(
    (sum, b) => sum + Number(b.captainEarnings),
    0
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
          Pending Earnings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Bookings awaiting payout processing
        </p>
      </div>

      {/* Summary Card */}
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-medium text-amber-900">
              Total Pending Earnings
            </p>
            <p className="mt-1 text-3xl font-semibold text-amber-900">
              RM {totalPendingEarnings.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-amber-700">
              from {bookings.length}{" "}
              {bookings.length === 1 ? "booking" : "bookings"}
            </p>
          </div>
          <div className="text-sm text-amber-800">
            <p>
              <strong>Next payment:</strong> Estimated 1st of next month
            </p>
            <p className="mt-1">
              Payouts are typically processed within 7-14 business days.
            </p>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <PendingBookingsTable bookings={bookings} />

      {/* Info Card */}
      {bookings.length > 0 && (
        <div className="p-4 border rounded-lg bg-slate-50 border-slate-200">
          <h3 className="text-sm font-medium text-slate-900">
            About Pending Earnings
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc list-inside">
            <li>
              Earnings from completed and paid bookings are held until the next
              payment cycle
            </li>
            <li>Payments are typically processed within 7-14 business days.</li>
            <li>
              Make sure your{" "}
              <Link
                href="/captain/documents"
                className="text-blue-600 hover:underline"
              >
                bank details
              </Link>{" "}
              are up to date to avoid delays
            </li>
            <li>
              You'll receive an email notification when your payment is approved
              and completed
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
