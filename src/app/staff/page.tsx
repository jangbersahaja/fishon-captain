import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function StaffHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");
  return (
    <div className="px-6 py-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Staff Dashboard</h1>
      <p className="text-sm text-slate-600">Internal tools coming soon.</p>
    </div>
  );
}
