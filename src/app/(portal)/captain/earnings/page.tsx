import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import {
  getCaptainBookings,
  getCaptainEarningsSummary,
  getCaptainPayoutHistory,
  type TimePeriod,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BankInfoCard } from "./_components/BankInfoCard";
import { EarningsNav } from "./_components/EarningsNav";
import { EarningsOverview } from "./_components/EarningsOverview";
import { PayoutHistoryList } from "./_components/PayoutHistoryList";
import { PendingEarningsCard } from "./_components/PendingEarningsCard";
import { PeriodSelector } from "./_components/PeriodSelector";
import { RecentEarningsList } from "./_components/RecentEarningsList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Earnings | Fishon Captain",
  description:
    "Track your earnings, completed payments, and pending settlements",
};

interface PageProps {
  searchParams?: Promise<{ period?: string; adminUserId?: string }>;
}

export default async function CaptainEarningsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/earnings");
  }

  const params = await searchParams;
  const period = (params?.period as TimePeriod) || "30d";
  const adminUserId = params?.adminUserId;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/auth?mode=signin&next=/captain/earnings");
  }

  const userId = effectiveUserId;

  // Fetch earnings summary with period
  const earningsSummary = await getCaptainEarningsSummary(userId, period);

  // Fetch recent earnings/bookings (last 10)
  const recentBookings = await getCaptainBookings(userId, { limit: 10 });

  // Fetch payout history (recent 10)
  const payoutHistory = await getCaptainPayoutHistory(userId);

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Earnings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Track your earnings from bookings and view payment history
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-10 w-40 animate-pulse bg-slate-200 rounded-lg" />
          }
        >
          <PeriodSelector />
        </Suspense>
      </div>

      {/* Navigation */}
      <EarningsNav />

      {/* Earnings Overview */}
      <EarningsOverview summary={earningsSummary} period={period} />

      {/* Pending Earnings Alert */}
      {earningsSummary.pendingPayout > 0 && (
        <PendingEarningsCard
          amount={earningsSummary.pendingPayout}
          nextPayoutDate={earningsSummary.nextPayoutDate}
        />
      )}

      {/* Recent Earnings */}
      <RecentEarningsList bookings={recentBookings} />

      {/* Bank Account Info */}
      <BankInfoCard userId={userId} />

      {/* Payment Batches History */}
      <PayoutHistoryList payouts={payoutHistory} />
    </div>
  );
}
