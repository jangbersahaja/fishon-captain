import { authOptions } from "@/lib/auth";
import type { MarketBooking } from "@/lib/market-db";
import { prisma } from "@/lib/prisma";
import {
  getMonthlyBookingStats,
  getStaffBookingStats,
  getStaffBookingsWithPagination,
} from "@/lib/staff-booking-service";
import {
  AlertCircle,
  BarChart3,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Filter,
  Search,
  X,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AnalyticsDashboard } from "./_components/AnalyticsDashboard";
import { BookingCard } from "./_components/BookingCard";
import { CharterFilterSelect } from "./_components/CharterFilterSelect";
import { DateRangeFilter } from "./_components/DateRangeFilter";
import { StatsCard } from "./_components/StatsCard";

export default async function StaffBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/bookings");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const params = await searchParams;
  const search = params.search || "";
  const statusFilter = params.status || "";
  const flowTypeFilter = params.flowType || "";
  const charterFilter = params.charter || "";
  const paymentMethodFilter = params.paymentMethod || "";
  const dateFromFilter = params.dateFrom || "";
  const dateToFilter = params.dateTo || "";
  const page = parseInt(params.page || "1");

  // Build filters
  const filters: {
    status?: MarketBooking["status"];
    flowType?: "MANUAL" | "AUTO";
    charterId?: string;
    paymentMethod?: string;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {};

  if (statusFilter) filters.status = statusFilter as MarketBooking["status"];
  if (flowTypeFilter) filters.flowType = flowTypeFilter as "MANUAL" | "AUTO";
  if (charterFilter) filters.charterId = charterFilter;
  if (paymentMethodFilter) filters.paymentMethod = paymentMethodFilter;
  if (search) filters.search = search;
  if (dateFromFilter) filters.dateFrom = new Date(dateFromFilter);
  if (dateToFilter) filters.dateTo = new Date(dateToFilter);

  // Fetch bookings with pagination
  const { bookings, pagination } = await getStaffBookingsWithPagination(
    filters,
    page
  );

  // Fetch stats
  const [stats, monthlyStats] = await Promise.all([
    getStaffBookingStats(),
    getMonthlyBookingStats(),
  ]);

  // Fetch all charters for filter dropdown
  const charters = await prisma.charter.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Build filter URL
  const buildFilterUrl = (newParams: Record<string, string>) => {
    const currentParams = new URLSearchParams();
    if (search) currentParams.set("search", search);
    if (statusFilter) currentParams.set("status", statusFilter);
    if (flowTypeFilter) currentParams.set("flowType", flowTypeFilter);
    if (charterFilter) currentParams.set("charter", charterFilter);
    if (paymentMethodFilter)
      currentParams.set("paymentMethod", paymentMethodFilter);
    if (dateFromFilter) currentParams.set("dateFrom", dateFromFilter);
    if (dateToFilter) currentParams.set("dateTo", dateToFilter);

    // Override with new params
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });

    return `/staff/bookings?${currentParams.toString()}`;
  };

  // Count active filters
  const activeFilterCount = [
    statusFilter,
    flowTypeFilter,
    charterFilter,
    paymentMethodFilter,
    dateFromFilter,
    dateToFilter,
  ].filter(Boolean).length;

  // Pagination
  const totalPages = pagination.totalPages;
  const currentPage = pagination.currentPage;
  const showFirstLast = totalPages > 7;
  const pageNumbers = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pageNumbers.push(1, 2, 3, 4, 5);
      pageNumbers.push(-1); // Ellipsis
      pageNumbers.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      pageNumbers.push(-1);
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pageNumbers.push(i);
      }
      pageNumbers.push(-2);
      pageNumbers.push(totalPages);
    }
  }

  return (
    <div className="px-4 py-8 mx-auto space-y-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage and monitor all platform bookings
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Bookings"
          value={stats.total}
          icon={CalendarIcon}
          variant="default"
        />
        <StatsCard
          title="Pending Actions"
          value={stats.pending}
          icon={AlertCircle}
          variant="warning"
        />
        <StatsCard
          title="Revenue (This Month)"
          value={`RM ${monthlyStats.revenue.toFixed(2)}`}
          icon={DollarSign}
          variant="success"
        />
        <StatsCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={CheckCircle}
          variant="default"
        />
      </div>

      {/* Analytics Dashboard */}
      <details className="group">
        <summary className="flex items-center justify-between w-full p-4 bg-white border cursor-pointer rounded-2xl border-slate-200 hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-900">
              Analytics Dashboard
            </span>
          </div>
          <span className="text-sm text-slate-500 group-open:hidden">
            Click to expand
          </span>
          <span className="hidden text-sm text-slate-500 group-open:inline">
            Click to collapse
          </span>
        </summary>
        <div className="pt-4">
          <Suspense
            fallback={
              <div className="p-8 text-center bg-white border rounded-2xl border-slate-200">
                <div className="animate-pulse">
                  <div className="w-8 h-8 mx-auto mb-4 rounded-full bg-slate-200" />
                  <p className="text-sm text-slate-500">Loading analytics...</p>
                </div>
              </div>
            }
          >
            <AnalyticsDashboard />
          </Suspense>
        </div>
      </details>

      {/* Filters and Search */}
      <div className="p-6 bg-white border rounded-2xl border-slate-200">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute w-4 h-4 transform -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <form action="/staff/bookings" method="get">
              {/* Preserve filters in hidden inputs */}
              {statusFilter && (
                <input type="hidden" name="status" value={statusFilter} />
              )}
              {flowTypeFilter && (
                <input type="hidden" name="flowType" value={flowTypeFilter} />
              )}
              {charterFilter && (
                <input type="hidden" name="charter" value={charterFilter} />
              )}
              {paymentMethodFilter && (
                <input
                  type="hidden"
                  name="paymentMethod"
                  value={paymentMethodFilter}
                />
              )}
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by booking ID, guest name, or email..."
                className="w-full py-2 pl-10 pr-4 text-sm border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </form>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="w-4 h-4" />
              Filters:
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterUrl({ status: "" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  !statusFilter
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Status
              </Link>
              <Link
                href={buildFilterUrl({ status: "PENDING" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "PENDING"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-700 hover:bg-red-100"
                }`}
              >
                🔴 Pending
              </Link>
              <Link
                href={buildFilterUrl({ status: "AWAITING_PAYMENT" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "AWAITING_PAYMENT"
                    ? "bg-yellow-600 text-white"
                    : "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                }`}
              >
                🟡 Awaiting Payment
              </Link>
              <Link
                href={buildFilterUrl({ status: "PAYMENT_AUTHORIZED" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "PAYMENT_AUTHORIZED"
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              >
                🔵 Payment Authorized
              </Link>
              <Link
                href={buildFilterUrl({ status: "PAID" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "PAID"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                🟢 Paid
              </Link>
              <Link
                href={buildFilterUrl({ status: "UNDER_REVIEW" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "UNDER_REVIEW"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                }`}
              >
                📋 Under Review
              </Link>
              <Link
                href={buildFilterUrl({ status: "COMPLETED" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "COMPLETED"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                ✅ Completed
              </Link>
              <Link
                href={buildFilterUrl({ status: "REJECTED" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "REJECTED"
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ❌ Rejected
              </Link>
              <Link
                href={buildFilterUrl({ status: "CANCELLED" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "CANCELLED"
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                🚫 Cancelled
              </Link>
              <Link
                href={buildFilterUrl({ status: "EXPIRED" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  statusFilter === "EXPIRED"
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                ⏱️ Expired
              </Link>
            </div>

            {/* Flow Type Filter */}
            <div className="flex gap-2">
              <Link
                href={buildFilterUrl({ flowType: "MANUAL" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  flowTypeFilter === "MANUAL"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Manual Flow
              </Link>
              <Link
                href={buildFilterUrl({ flowType: "AUTO" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  flowTypeFilter === "AUTO"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Auto Flow
              </Link>
            </div>

            {/* Payment Method Filter */}
            <div className="flex gap-2">
              <Link
                href={buildFilterUrl({ paymentMethod: "CARD" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  paymentMethodFilter === "CARD"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                <CreditCard className="inline w-3 h-3 mr-1" />
                Card
              </Link>
              <Link
                href={buildFilterUrl({ paymentMethod: "FPX" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  paymentMethodFilter === "FPX"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                FPX
              </Link>
              <Link
                href={buildFilterUrl({ paymentMethod: "EWALLET" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  paymentMethodFilter === "EWALLET"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                E-Wallet
              </Link>
            </div>

            {/* Charter Filter (Dropdown shown only when needed) */}
            {charters.length > 0 && (
              <CharterFilterSelect
                charters={charters}
                currentValue={charterFilter}
              />
            )}

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Link
                href="/staff/bookings"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 transition bg-red-50 rounded-lg hover:bg-red-100"
              >
                <X className="w-3 h-3" />
                Clear All
              </Link>
            )}
          </div>

          {/* Date Range Filter */}
          <div className="pt-4 border-t border-slate-200">
            <DateRangeFilter
              currentDateFrom={dateFromFilter}
              currentDateTo={dateToFilter}
            />
          </div>
        </div>
      </div>

      {/* Bookings Grid */}
      {bookings.length === 0 ? (
        <div className="p-12 text-center bg-white border rounded-2xl border-slate-200">
          <CalendarIcon className="w-12 h-12 mx-auto text-slate-400" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No bookings found
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {search || activeFilterCount > 0
              ? "Try adjusting your search or filters"
              : "No bookings have been created yet"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg border-slate-200">
              <div className="text-sm text-slate-700">
                Showing{" "}
                <span className="font-medium">
                  {(currentPage - 1) * 20 + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(currentPage * 20, pagination.totalCount)}
                </span>{" "}
                of <span className="font-medium">{pagination.totalCount}</span>{" "}
                results
              </div>
              <div className="flex gap-1">
                {/* First Button */}
                {showFirstLast && currentPage > 1 && (
                  <Link
                    href={buildFilterUrl({ page: "1" })}
                    className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    First
                  </Link>
                )}

                {/* Previous Button */}
                {pagination.hasPrevPage && (
                  <Link
                    href={buildFilterUrl({
                      page: (currentPage - 1).toString(),
                    })}
                    className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                )}

                {/* Page Numbers */}
                {pageNumbers.map((pageNum, index) => {
                  if (pageNum === -1 || pageNum === -2) {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-3 py-2 text-sm text-slate-400"
                      >
                        ...
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={buildFilterUrl({ page: pageNum.toString() })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                        pageNum === currentPage
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}

                {/* Next Button */}
                {pagination.hasNextPage && (
                  <Link
                    href={buildFilterUrl({
                      page: (currentPage + 1).toString(),
                    })}
                    className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}

                {/* Last Button */}
                {showFirstLast && currentPage < totalPages && (
                  <Link
                    href={buildFilterUrl({ page: totalPages.toString() })}
                    className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
                  >
                    Last
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
