/**
 * Create Promo Code Page
 * Form for creating new promotional codes
 */

import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PromoCodeForm } from "../_components/PromoCodeForm";

export default async function CreatePromoCodePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect("/auth?mode=signin&next=/staff/promo-codes/create");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="p-6 mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Create Promo Code
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure a new promotional code for your marketing campaigns
          </p>
        </div>

        <PromoCodeForm mode="create" />
      </div>
    </div>
  );
}
