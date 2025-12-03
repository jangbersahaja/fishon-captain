import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { getCaptainPayoutHistory } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { EarningsNav } from "../_components/EarningsNav";
import { PayoutHistoryList } from "../_components/PayoutHistoryList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payout History | Fishon Captain",
  description: "View your completed payout history",
};

interface PageProps {
  searchParams: Promise<{ adminUserId?: string }>;
}

export default async function PayoutHistoryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/earnings/history");
  }

  const { adminUserId } = await searchParams;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/auth?mode=signin&next=/captain/earnings/history");
  }

  // Fetch all payout history
  const payoutHistory = await getCaptainPayoutHistory(effectiveUserId);

  const totalPaidOut = payoutHistory.reduce(
    (sum, p) => sum + Number(p.netPayout),
    0
  );

  const completedPayouts = payoutHistory.filter(
    (p) => p.status === "COMPLETED"
  );

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Earnings</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your earnings from bookings and view payment history
        </p>
      </div>

      {/* Navigation */}
      <EarningsNav />

      {/* Summary Card */}
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="text-sm text-slate-600">Total Paid Out</p>
            <p className="mt-1 text-2xl font-semibold text-green-600">
              RM {totalPaidOut.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Completed Payouts</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {completedPayouts.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Total Batches</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {payoutHistory.length}
            </p>
          </div>
        </div>
      </div>

      {/* Payout History */}
      <PayoutHistoryList payouts={payoutHistory} showAll />
    </div>
  );
}
