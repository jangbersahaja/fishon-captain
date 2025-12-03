import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { getCaptainBookings } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EarningsNav } from "../_components/EarningsNav";
import { PendingBookingsTable } from "../_components/PendingBookingsTable";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ adminUserId?: string }>;
}

export default async function PendingBookingsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/earnings/pending");
  }

  const { adminUserId } = await searchParams;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/auth?mode=signin&next=/captain/earnings/pending");
  }

  // Fetch pending bookings
  const bookings = await getCaptainBookings(effectiveUserId, {
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
        <h1 className="text-2xl font-semibold text-slate-900">Earnings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your earnings from bookings and view payment history
        </p>
      </div>

      {/* Navigation */}
      <EarningsNav />

      {/* Summary Card */}
      <div className="p-6 border rounded-lg bg-amber-50 border-amber-200">
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
              <strong>Payout timeline:</strong> 3-5 business days after trip
              completion
            </p>
            <p className="mt-1">
              Payouts are processed weekly after your trips are completed.
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
          <ul className="mt-2 space-y-1 text-sm list-disc list-inside text-slate-600">
            <li>
              Earnings become eligible for payout 3 business days after your
              trip is completed
            </li>
            <li>Payouts are processed weekly by our team</li>
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
              You&apos;ll receive an email notification when your payment is
              processed
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
