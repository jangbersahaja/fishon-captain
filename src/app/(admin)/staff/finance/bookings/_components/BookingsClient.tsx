"use client";

import type { BookingFinancial } from "@/lib/services/finance-service";
import { getPresetDateRange } from "@/lib/utils/date-range-utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  BookingTable,
  type BookingTableTotals,
} from "../../../_components/BookingTable";
import {
  DateRangeFilter,
  type DateRangePreset,
} from "../../_components/DateRangeFilter";
import { FinanceNav } from "../../_components/FinanceNav";

type BookingDateField = "date" | "createdAt";

export function BookingsClient() {
  // Date range state
  const defaultRange = getPresetDateRange("30d");
  const [startDate, setStartDate] = useState<Date>(defaultRange.from);
  const [endDate, setEndDate] = useState<Date>(defaultRange.to);

  // Filter state
  const [status, setStatus] = useState<string>("");
  const [payoutStatus, setPayoutStatus] = useState<string>("");
  const [dateField, setDateField] = useState<BookingDateField>("createdAt");

  // Data state
  const [bookings, setBookings] = useState<BookingFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, status, payoutStatus, dateField]);

  // Status groups for filtering (matching BookingStatus enum)
  const statusGroups = {
    GROUP_RECEIVED: ["PAID", "COMPLETED"],
    GROUP_PENDING: [
      "PENDING",
      "AWAITING_PAYMENT",
      "PAYMENT_AUTHORIZED",
      "UNDER_REVIEW",
    ],
    GROUP_LOST: ["REJECTED", "CANCELLED", "EXPIRED"],
  };

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      // Expand group filters to actual status values
      let statusParam = status;
      if (status && status.startsWith("GROUP_")) {
        const groupStatuses = statusGroups[status as keyof typeof statusGroups];
        if (groupStatuses) {
          statusParam = groupStatuses.join(",");
        }
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateField,
        ...(statusParam && { status: statusParam }),
        ...(payoutStatus && { payoutStatus }),
      });

      const response = await fetch(`/api/admin/finance/bookings?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const result = await response.json();
      setBookings(result.bookings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (
    start: Date,
    end: Date,
    _preset?: DateRangePreset
  ) => {
    setStartDate(start);
    setEndDate(end);
  };

  const clearFilters = () => {
    setStatus("");
    setPayoutStatus("");
    setDateField("createdAt");
    const range = getPresetDateRange("30d");
    setStartDate(range.from);
    setEndDate(range.to);
  };

  const hasFilters =
    status !== "" || payoutStatus !== "" || dateField !== "createdAt";

  // Calculate totals for table footer
  // Gross revenue = finalPrice + discount (what angler would pay without discount)
  const tableTotals: BookingTableTotals = {
    grossRevenue: bookings.reduce(
      (sum, b) => sum + (b.finalPrice ?? 0) + (b.discountAmount ?? 0),
      0
    ),
    discount: bookings.reduce((sum, b) => sum + (b.discountAmount ?? 0), 0),
    tripIncome: bookings.reduce((sum, b) => sum + (b.tripIncome ?? 0), 0),
    serviceIncome: bookings.reduce((sum, b) => sum + (b.serviceIncome ?? 0), 0),
    paymentGateway: bookings.reduce(
      (sum, b) => sum + (b.paymentGatewayFee ?? 0),
      0
    ),
    captainEarnings: bookings.reduce(
      (sum, b) => sum + (b.captainEarnings ?? 0),
      0
    ),
  };

  // Date field labels
  const dateFieldLabels: Record<BookingDateField, string> = {
    date: "Trip Date",
    createdAt: "Booking Date",
  };

  // Build export URL (expand group filters for export)
  const getExportStatus = () => {
    if (!status) return undefined;
    if (status.startsWith("GROUP_")) {
      const groupStatuses = statusGroups[status as keyof typeof statusGroups];
      return groupStatuses?.join(",");
    }
    return status;
  };

  const exportUrl = `/api/admin/finance/bookings/export?${new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dateField,
    ...(getExportStatus() && { status: getExportStatus()! }),
    ...(payoutStatus && { payoutStatus }),
  }).toString()}`;

  if (loading && bookings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Finance Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""} · RM{" "}
            {tableTotals.grossRevenue.toLocaleString()} gross
            <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 rounded-full">
              by {dateFieldLabels[dateField]}
            </span>
            {loading && (
              <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin" />
            )}
          </p>
        </div>
        <a
          href={exportUrl}
          className="px-4 py-2 text-sm font-medium text-white bg-[#ec2227] rounded-lg hover:bg-[#d11f23] transition"
        >
          Export CSV
        </a>
      </div>

      {/* Navigation */}
      <FinanceNav />

      {/* Date Range Filter */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
        />
      </div>

      {/* Status Filters */}
      <div className="p-4 space-y-4 border rounded-lg border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-sm bg-white border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <optgroup label="✅ Received">
                <option value="GROUP_RECEIVED">All Received</option>
                <option value="PAID">Paid</option>
                <option value="COMPLETED">Completed</option>
              </optgroup>
              <optgroup label="⏳ Pending">
                <option value="GROUP_PENDING">All Pending</option>
                <option value="PENDING">Pending (Awaiting Approval)</option>
                <option value="AWAITING_PAYMENT">Awaiting Payment</option>
                <option value="PAYMENT_AUTHORIZED">Payment Authorized</option>
                <option value="UNDER_REVIEW">Under Review</option>
              </optgroup>
              <optgroup label="❌ Lost">
                <option value="GROUP_LOST">All Lost</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </optgroup>
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
              value={payoutStatus}
              onChange={(e) => setPayoutStatus(e.target.value)}
              className="block w-full px-3 py-2 mt-1 text-sm bg-white border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              value={dateField}
              onChange={(e) => setDateField(e.target.value as BookingDateField)}
              className="block w-full px-3 py-2 mt-1 text-sm bg-white border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Booking Date</option>
              <option value="date">Trip Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table with Footer Totals */}
      <div className="bg-white border rounded-lg border-slate-200">
        <BookingTable bookings={bookings} totals={tableTotals} />
      </div>
    </div>
  );
}
