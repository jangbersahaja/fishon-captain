import authOptions from "@/lib/auth";
import {
  getCaptainEarningsSummary,
  getCaptainPayoutHistory,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BankInfoCard } from "./_components/BankInfoCard";
import { EarningsOverview } from "./_components/EarningsOverview";
import { PayoutHistoryList } from "./_components/PayoutHistoryList";
import { PendingEarningsCard } from "./_components/PendingEarningsCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Earnings & Payouts | Fishon Captain",
  description: "Track your earnings and payout history",
};

export default async function CaptainPayoutsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/payouts");
  }

  const userId = session.user.id;

  // Fetch earnings summary
  const earningsSummary = await getCaptainEarningsSummary(userId);

  // Fetch payout history (recent 10)
  const payoutHistory = await getCaptainPayoutHistory(userId);

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Earnings & Payouts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Track your earnings from bookings and manage payout details
        </p>
      </div>

      {/* Earnings Overview */}
      <EarningsOverview summary={earningsSummary} />

      {/* Pending Earnings Alert */}
      {earningsSummary.pendingPayout > 0 && (
        <PendingEarningsCard
          amount={earningsSummary.pendingPayout}
          nextPayoutDate={earningsSummary.nextPayoutDate}
        />
      )}

      {/* Bank Account Info */}
      <BankInfoCard userId={userId} />

      {/* Payout History */}
      <PayoutHistoryList payouts={payoutHistory} />
    </div>
  );
}
