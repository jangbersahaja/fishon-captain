import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReferralsPageContent } from "./_components/ReferralsPageContent";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Referrals | Fishon Captain",
  description:
    "Invite other captains and earn commissions when they complete their first trip",
};

export default async function CaptainReferralsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/captain/referrals");
  }

  return (
    <div className="p-4 space-y-6 md:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Affiliate Programme
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Invite captains to join Fishon and earn commissions on their first
            completed trip
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Suspense
        fallback={
          <div className="space-y-6">
            {/* Loading skeleton */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="h-8 w-48 bg-slate-200 rounded mb-4" />
              <div className="h-12 w-full bg-slate-200 rounded" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-10 w-full bg-slate-200 rounded" />
                <div className="h-10 w-full bg-slate-200 rounded" />
                <div className="h-10 w-full bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        }
      >
        <ReferralsPageContent />
      </Suspense>
    </div>
  );
}
