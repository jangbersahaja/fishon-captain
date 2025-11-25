import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import FinanceDashboard from "./_components/FinanceDashboard";

export const dynamic = "force-dynamic";

export default async function StaffFinancePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/finance");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  return <FinanceDashboard />;
}
