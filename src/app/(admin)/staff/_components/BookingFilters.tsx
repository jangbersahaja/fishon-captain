"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BookingFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "";
  const currentPayoutStatus = searchParams.get("payoutStatus") || "";
  const currentDateField = searchParams.get("dateField") || "paidAt";
  const currentStartDate = searchParams.get("startDate") || "";
  const currentEndDate = searchParams.get("endDate") || "";

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`?${params.toString()}`);
  };

  const clearFilters = () => {
    router.push("/staff/finance/bookings");
  };

  const hasFilters =
    currentStatus ||
    currentPayoutStatus ||
    currentDateField !== "paidAt" ||
    currentStartDate ||
    currentEndDate;

  return (
    <div className="p-4 space-y-4 border border-slate-200 rounded-lg bg-slate-50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Booking Status Filter */}
        <div>
          <label
            htmlFor="status"
            className="block text-xs font-medium text-slate-700"
          >
            Booking Status
          </label>
          <select
            id="status"
            value={currentStatus}
            onChange={(e) => updateFilters({ status: e.target.value })}
            className="block w-full px-3 py-2 mt-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="EXPIRED">Expired</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Payout Status Filter */}
        <div>
          <label
            htmlFor="payoutStatus"
            className="block text-xs font-medium text-slate-700"
          >
            Payout Status
          </label>
          <select
            id="payoutStatus"
            value={currentPayoutStatus}
            onChange={(e) => updateFilters({ payoutStatus: e.target.value })}
            className="block w-full px-3 py-2 mt-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Payout Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="ON_HOLD">On Hold</option>
          </select>
        </div>

        {/* Date Field Selector */}
        <div>
          <label
            htmlFor="dateField"
            className="block text-xs font-medium text-slate-700"
          >
            Filter By Date
          </label>
          <select
            id="dateField"
            value={currentDateField}
            onChange={(e) => updateFilters({ dateField: e.target.value })}
            className="block w-full px-3 py-2 mt-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="paidAt">Payment Date</option>
            <option value="date">Trip Date</option>
            <option value="createdAt">Booking Date</option>
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label
            htmlFor="startDate"
            className="block text-xs font-medium text-slate-700"
          >
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={currentStartDate}
            onChange={(e) => updateFilters({ startDate: e.target.value })}
            className="block w-full px-3 py-2 mt-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label
            htmlFor="endDate"
            className="block text-xs font-medium text-slate-700"
          >
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={currentEndDate}
            onChange={(e) => updateFilters({ endDate: e.target.value })}
            className="block w-full px-3 py-2 mt-1 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
