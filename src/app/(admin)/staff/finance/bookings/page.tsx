import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingsClient } from "./_components/BookingsClient";

export const dynamic = "force-dynamic";

export default async function StaffFinanceBookingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect("/auth?mode=signin&next=/staff/finance/bookings");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  return <BookingsClient />;
}
