import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminReferralsClient } from "./_components/AdminReferralsClient";

export const metadata = {
  title: "Referral Programme | Staff",
};

export default async function AdminReferralsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/referrals");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Referral Programme
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Monitor captain referrals, commissions, and programme performance
        </p>
      </div>

      <AdminReferralsClient />
    </div>
  );
}
