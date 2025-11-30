"use client";

import type { BookingFinancial } from "@/lib/services/finance-service";
import { getPresetDateRange } from "@/lib/utils/date-range-utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { BookingTable } from "../../../_components/BookingTable";
import {
  DateRangeFilter,
  type DateRangePreset,
} from "../../_components/DateRangeFilter";
import { FinanceNav } from "../../_components/FinanceNav";

type BookingDateField = "paidAt" | "date" | "createdAt";

interface BookingsData {
  bookings: BookingFinancial[];
  filters: {
    status?: string;
    payoutStatus?: string;
    dateField: BookingDateField;
    startDate: string;
    endDate: string;
  };
}

export function BookingsClient() {
  // Date range state
  const defaultRange = getPresetDateRange("30d");
  const [startDate, setStartDate] = useState<Date>(defaultRange.from);
  const [endDate, setEndDate] = useState<Date>(defaultRange.to);

  // Filter state
  const [status, setStatus] = useState<string>("");
  const [payoutStatus, setPayoutStatus] = useState<string>("");
  const [dateField, setDateField] = useState<BookingDateField>("paidAt");

  // Data state
  const [bookings, setBookings] = useState<BookingFinancial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, status, payoutStatus, dateField]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateField,
        ...(status && { status }),
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
    setDateField("paidAt");
    const range = getPresetDateRange("30d");
    setStartDate(range.from);
    setEndDate(range.to);
  };

  const hasFilters =
    status !== "" || payoutStatus !== "" || dateField !== "paidAt";

  // Segment bookings by status category
  const receivedStatuses = ["PAID", "COMPLETED"];
  const pendingStatuses = ["PENDING", "APPROVED"];
  const lostStatuses = ["CANCELLED", "REJECTED", "EXPIRED", "REFUNDED"];

  const receivedBookings = bookings.filter((b) =>
    receivedStatuses.includes(b.status)
  );
  const pendingBookings = bookings.filter((b) =>
    pendingStatuses.includes(b.status)
  );
  const lostBookings = bookings.filter((b) => lostStatuses.includes(b.status));

  // Calculate totals for RECEIVED bookings
  const receivedRevenue = receivedBookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? 0),
    0
  );
  const receivedTripIncome = receivedBookings.reduce(
    (sum, b) => sum + (b.tripIncome ?? 0),
    0
  );
  const receivedServiceIncome = receivedBookings.reduce(
    (sum, b) => sum + (b.serviceIncome ?? 0),
    0
  );
  const receivedDiscount = receivedBookings.reduce(
    (sum, b) => sum + (b.discountAmount ?? 0),
    0
  );
  const receivedFishonRevenue =
    receivedTripIncome + receivedServiceIncome - receivedDiscount;
  const receivedPaymentGateway = receivedBookings.reduce(
    (sum, b) => sum + (b.paymentGatewayFee ?? 0),
    0
  );
  const receivedCaptainEarnings = receivedBookings.reduce(
    (sum, b) => sum + (b.captainEarnings ?? 0),
    0
  );

  // Calculate totals for PENDING bookings
  const pendingRevenue = pendingBookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? 0),
    0
  );
  const pendingTripIncome = pendingBookings.reduce(
    (sum, b) => sum + (b.tripIncome ?? 0),
    0
  );

  // Calculate totals for LOST bookings
  const lostRevenue = lostBookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? 0),
    0
  );
  const lostTripIncome = lostBookings.reduce(
    (sum, b) => sum + (b.tripIncome ?? 0),
    0
  );

  // Overall totals
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + (b.finalPrice ?? 0),
    0
  );
  const tripIncome = bookings.reduce((sum, b) => sum + (b.tripIncome ?? 0), 0);
  const captainEarnings = bookings.reduce(
    (sum, b) => sum + (b.captainEarnings ?? 0),
    0
  );

  // Date field labels
  const dateFieldLabels: Record<BookingDateField, string> = {
    paidAt: "Payment Date",
    date: "Trip Date",
    createdAt: "Booking Date",
  };

  // Build export URL
  const exportUrl = `/api/admin/finance/bookings/export?${new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    dateField,
    ...(status && { status }),
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
            {totalRevenue.toLocaleString()} total value
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
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="EXPIRED">Expired</option>
              <option value="REFUNDED">Refunded</option>
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
              <option value="paidAt">Payment Date (Finance)</option>
              <option value="date">Trip Date (Operations)</option>
              <option value="createdAt">Booking Date (Activity)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Booking Status Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Received */}
        <div className="p-4 border-2 rounded-lg border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <dt className="text-sm font-medium text-emerald-800">
              Received (PAID/COMPLETED)
            </dt>
          </div>
          <dd className="text-2xl font-bold text-emerald-700">
            RM {receivedRevenue.toLocaleString()}
          </dd>
          <dd className="mt-1 text-xs text-emerald-600">
            {receivedBookings.length} booking
            {receivedBookings.length !== 1 ? "s" : ""} · Fishon: RM{" "}
            {receivedFishonRevenue.toLocaleString()}
          </dd>
        </div>

        {/* Pending */}
        <div className="p-4 border-2 rounded-lg border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <dt className="text-sm font-medium text-amber-800">
              Pending (PENDING/APPROVED)
            </dt>
          </div>
          <dd className="text-2xl font-bold text-amber-700">
            RM {pendingRevenue.toLocaleString()}
          </dd>
          <dd className="mt-1 text-xs text-amber-600">
            {pendingBookings.length} booking
            {pendingBookings.length !== 1 ? "s" : ""} · Potential: RM{" "}
            {pendingTripIncome.toLocaleString()}
          </dd>
        </div>

        {/* Lost */}
        <div className="p-4 border-2 border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <dt className="text-sm font-medium text-red-800">
              Lost (CANCELLED/REJECTED/EXPIRED)
            </dt>
          </div>
          <dd className="text-2xl font-bold text-red-700">
            RM {lostRevenue.toLocaleString()}
          </dd>
          <dd className="mt-1 text-xs text-red-600">
            {lostBookings.length} booking{lostBookings.length !== 1 ? "s" : ""}{" "}
            · Missed: RM {lostTripIncome.toLocaleString()}
          </dd>
        </div>
      </div>

      {/* Received Revenue Breakdown */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl">
        <h3 className="mb-4 text-sm font-semibold text-slate-800">
          Received Revenue Breakdown (PAID/COMPLETED only)
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 border rounded-lg border-slate-100 bg-slate-50">
            <dt className="text-xs text-slate-500">Total Received</dt>
            <dd className="mt-1 text-xl font-semibold text-blue-600">
              RM {receivedRevenue.toLocaleString()}
            </dd>
          </div>
          <div className="p-3 border rounded-lg border-slate-100 bg-slate-50">
            <dt className="text-xs text-slate-500">Fishon Revenue</dt>
            <dd className="mt-1 text-xl font-semibold text-emerald-600">
              RM {receivedFishonRevenue.toLocaleString()}
            </dd>
            <dd className="text-xs text-slate-400">
              Trip RM {receivedTripIncome.toLocaleString()} + Service RM{" "}
              {receivedServiceIncome.toLocaleString()} - Discount RM{" "}
              {receivedDiscount.toLocaleString()}
            </dd>
          </div>
          <div className="p-3 border rounded-lg border-slate-100 bg-slate-50">
            <dt className="text-xs text-slate-500">Captain Payouts</dt>
            <dd className="mt-1 text-xl font-semibold text-purple-600">
              RM {receivedCaptainEarnings.toLocaleString()}
            </dd>
          </div>
          <div className="p-3 border rounded-lg border-slate-100 bg-slate-50">
            <dt className="text-xs text-slate-500">Payment Gateway</dt>
            <dd className="mt-1 text-xl font-semibold text-slate-600">
              RM {receivedPaymentGateway.toLocaleString()}
            </dd>
          </div>
        </div>
      </div>

      {/* All Bookings Summary */}
      {!status && (
        <div className="p-5 border bg-slate-50 border-slate-200 rounded-xl">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">
            All Bookings Summary
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="p-3 bg-white border rounded-lg border-slate-100">
              <dt className="text-xs text-slate-500">Total Value</dt>
              <dd className="mt-1 text-lg font-semibold text-slate-800">
                RM {totalRevenue.toLocaleString()}
              </dd>
              <dd className="text-xs text-slate-400">
                {bookings.length} bookings
              </dd>
            </div>
            <div className="p-3 bg-white border rounded-lg border-slate-100">
              <dt className="text-xs text-slate-500">Total Trip Income</dt>
              <dd className="mt-1 text-lg font-semibold text-emerald-600">
                RM {tripIncome.toLocaleString()}
              </dd>
            </div>
            <div className="p-3 bg-white border rounded-lg border-slate-100">
              <dt className="text-xs text-slate-500">Total Captain</dt>
              <dd className="mt-1 text-lg font-semibold text-purple-600">
                RM {captainEarnings.toLocaleString()}
              </dd>
            </div>
            <div className="p-3 bg-white border rounded-lg border-slate-100">
              <dt className="text-xs text-slate-500">Conversion Rate</dt>
              <dd className="mt-1 text-lg font-semibold text-blue-600">
                {bookings.length > 0
                  ? `${((receivedBookings.length / bookings.length) * 100).toFixed(1)}%`
                  : "0%"}
              </dd>
              <dd className="text-xs text-slate-400">
                {receivedBookings.length} of {bookings.length} paid
              </dd>
            </div>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div className="bg-white border rounded-lg border-slate-200">
        <BookingTable bookings={bookings} />
      </div>
    </div>
  );
}
