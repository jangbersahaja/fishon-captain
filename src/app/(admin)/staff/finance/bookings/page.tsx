import authOptions from "@/lib/auth";
import { getBookingsFinancial } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BookingFilters } from "../../_components/BookingFilters";
import { BookingTable } from "../../_components/BookingTable";
// Types from fishon-market
type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";
type PayoutStatus =
  | "PENDING"
  | "SCHEDULED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "ON_HOLD";

export const dynamic = "force-dynamic";

interface SearchParams {
  bookingStatus?: BookingStatus;
  payoutStatus?: PayoutStatus;
  startDate?: string;
  endDate?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

export default async function StaffFinanceBookingsPage({
  searchParams,
}: PageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user)
    redirect("/auth?mode=signin&next=/staff/finance/bookings");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Parse search params
  const params = await searchParams;
  const filters = {
    bookingStatus: params.bookingStatus,
    payoutStatus: params.payoutStatus,
    startDate: params.startDate ? new Date(params.startDate) : undefined,
    endDate: params.endDate ? new Date(params.endDate) : undefined,
  };

  // Fetch bookings
  const bookings = await getBookingsFinancial(filters);

  // Calculate totals
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? 0),
    0
  );
  const totalCommission = bookings.reduce(
    (sum, b) => sum + (b.platformFee ?? 0),
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            All Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""} · RM{" "}
            {totalRevenue.toLocaleString()} total revenue
          </p>
        </div>
        <a
          href={`/api/admin/finance/bookings/export?${new URLSearchParams({
            ...(params.bookingStatus && {
              bookingStatus: params.bookingStatus,
            }),
            ...(params.payoutStatus && { payoutStatus: params.payoutStatus }),
            ...(params.startDate && { startDate: params.startDate }),
            ...(params.endDate && { endDate: params.endDate }),
          }).toString()}`}
          className="px-4 py-2 text-sm font-medium text-white bg-[#ec2227] rounded-lg hover:bg-[#d11f23] transition"
        >
          Export CSV
        </a>
      </div>

      {/* Filters */}
      <BookingFilters />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <dt className="text-sm text-slate-600">Total Revenue</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-900">
            RM {totalRevenue.toLocaleString()}
          </dd>
        </div>
        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <dt className="text-sm text-slate-600">Platform Commission</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-900">
            RM {totalCommission.toLocaleString()}
          </dd>
          <dd className="mt-1 text-xs text-slate-500">
            {totalRevenue > 0
              ? `${((totalCommission / totalRevenue) * 100).toFixed(1)}%`
              : "0%"}{" "}
            avg rate
          </dd>
        </div>
        <div className="p-4 border border-slate-200 rounded-lg bg-white">
          <dt className="text-sm text-slate-600">Captain Earnings</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-900">
            RM {(totalRevenue - totalCommission).toLocaleString()}
          </dd>
          <dd className="mt-1 text-xs text-slate-500">
            {totalRevenue > 0
              ? `${(((totalRevenue - totalCommission) / totalRevenue) * 100).toFixed(1)}%`
              : "0%"}{" "}
            of revenue
          </dd>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="border border-slate-200 rounded-lg bg-white">
        <BookingTable bookings={bookings} />
      </div>
    </div>
  );
}
