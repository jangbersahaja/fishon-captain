/**
 * Admin Pricing Management Page
 * 
 * Centralized pricing control and monitoring:
 * - View all trip prices (base + promo)
 * - Configure promotional pricing
 * - Monitor pricing effectiveness
 * - Track price change history
 * 
 * Note: All charters use BASIC plan (10% commission)
 */

import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PricingDashboard } from "./_components/PricingDashboard";

export const metadata = {
  title: "Pricing Management | Fishon Captain",
  description: "Manage charter trip pricing and promotional offers",
};

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Pricing Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage trip pricing and promotional offers across all charters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PricingDashboard />
      </div>
    </div>
  );
}
