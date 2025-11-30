"use client";

import { getPresetDateRange } from "@/lib/utils/date-range-utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { DateRangeFilter } from "./DateRangeFilter";
import { FinanceNav } from "./FinanceNav";
import { MetricCard } from "./MetricCard";
import { RevenueChart } from "./RevenueChart";

type BookingDateField = "paidAt" | "date" | "createdAt";

interface RevenueStats {
  totalRevenue: number;
  platformRevenue: number;
  tripIncome: number;
  serviceIncome: number;
  captainRevenue: number;
  totalDiscount: number;
  paymentGatewayFee: number;
  totalTax: number;
  bookingCount: number;
  avgBookingValue: number;
}

interface RevenueComparison {
  current: RevenueStats;
  previous: RevenueStats;
  changes: {
    totalRevenue: number;
    platformRevenue: number;
    bookingCount: number;
    avgBookingValue: number;
  };
}

interface DailyRevenue {
  date: string;
  totalRevenue: number;
  platformRevenue: number;
  tripIncome: number;
  serviceIncome: number;
  bookingCount: number;
}

interface FinanceData {
  comparison: RevenueComparison;
  dailyRevenue: DailyRevenue[];
  period: {
    start: string;
    end: string;
  };
}

export default function FinanceDashboard() {
  const defaultRange = getPresetDateRange("30d");
  const [startDate, setStartDate] = useState<Date>(defaultRange.from);
  const [endDate, setEndDate] = useState<Date>(defaultRange.to);
  const [dateField, setDateField] = useState<BookingDateField>("paidAt");
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, dateField]);

  const fetchFinanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateField,
      });

      const response = await fetch(`/api/admin/finance/stats?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch finance data");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { comparison, dailyRevenue } = data;
  const { current, previous, changes } = comparison;

  const dateFieldLabels: Record<BookingDateField, string> = {
    paidAt: "Payment Date",
    date: "Trip Date",
    createdAt: "Booking Date",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Finance Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">
          Comprehensive financial analytics and performance metrics
          <span className="ml-2 px-2 py-0.5 text-xs bg-slate-100 rounded-full">
            by {dateFieldLabels[dateField]}
          </span>
        </p>
      </div>

      {/* Navigation */}
      <FinanceNav />

      {/* Date range filter and Date field selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />

          {/* Date Field Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Filter by:</span>
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as BookingDateField)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="paidAt">Payment Date</option>
              <option value="date">Trip Date</option>
              <option value="createdAt">Booking Date</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Sales"
          value={current.totalRevenue}
          previousValue={previous.totalRevenue}
          change={changes.totalRevenue}
          description="Revenue from anglers"
          color="blue"
          format="currency"
        />

        <MetricCard
          title="Fishon Revenue"
          value={current.platformRevenue}
          previousValue={previous.platformRevenue}
          change={changes.platformRevenue}
          description="Trip income + Service income - Discount"
          color="emerald"
          format="currency"
        />

        <MetricCard
          title="Captain Earnings"
          value={current.captainRevenue}
          previousValue={previous.captainRevenue}
          description="Total captain payouts"
          color="purple"
          format="currency"
        />

        <MetricCard
          title="Bookings"
          value={current.bookingCount}
          previousValue={previous.bookingCount}
          change={changes.bookingCount}
          description="PAID + COMPLETED"
          color="slate"
          format="number"
        />
      </div>

      {/* Fishon Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Trip Income"
          value={current.tripIncome}
          previousValue={previous.tripIncome}
          description="10% commission from trip price"
          color="emerald"
          format="currency"
        />

        <MetricCard
          title="Service Income"
          value={current.serviceIncome}
          previousValue={previous.serviceIncome}
          description="0.5% Fishon service fee"
          color="emerald"
          format="currency"
        />

        <MetricCard
          title="Total Discount"
          value={current.totalDiscount}
          previousValue={previous.totalDiscount}
          description="Absorbed from trip income"
          color="amber"
          format="currency"
        />

        <MetricCard
          title="Payment Gateway"
          value={current.paymentGatewayFee}
          previousValue={previous.paymentGatewayFee}
          description="1.5% SenangPay fee"
          color="slate"
          format="currency"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Booking Value"
          value={current.avgBookingValue}
          previousValue={previous.avgBookingValue}
          change={changes.avgBookingValue}
          description="Per booking"
          color="blue"
          format="currency"
        />

        <MetricCard
          title="Tax Collected"
          value={current.totalTax}
          previousValue={previous.totalTax}
          description="Held for govt"
          color="slate"
          format="currency"
        />
      </div>

      {/* Revenue trend chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Revenue Trend
          </h2>
          <p className="text-sm text-slate-600">
            Daily revenue breakdown for selected period
          </p>
        </div>
        <RevenueChart data={dailyRevenue} height={350} />
      </div>

      {/* Balance verification section */}
      <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Financial Balance
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-200">
            <span className="text-sm text-slate-600">Total Sales</span>
            <span className="text-sm font-semibold text-slate-900">
              RM {current.totalRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4">
            <span className="text-sm text-slate-600">= Captain Earnings</span>
            <span className="text-sm text-emerald-600">
              RM {current.captainRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4">
            <span className="text-sm text-slate-600">+ Fishon Revenue</span>
            <span className="text-sm text-emerald-600">
              RM {current.platformRevenue.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-8 text-xs">
            <span className="text-slate-500">↳ Trip Income (10%)</span>
            <span className="text-emerald-500">
              RM {current.tripIncome.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-8 text-xs">
            <span className="text-slate-500">↳ Service Income (0.5%)</span>
            <span className="text-emerald-500">
              RM {current.serviceIncome.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-8 text-xs">
            <span className="text-slate-500">↳ Discount Applied</span>
            <span className="text-amber-500">
              - RM {current.totalDiscount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4">
            <span className="text-sm text-slate-600">+ Payment Gateway</span>
            <span className="text-sm text-amber-600">
              RM {current.paymentGatewayFee.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4">
            <span className="text-sm text-slate-600">+ Tax</span>
            <span className="text-sm text-slate-600">
              RM {current.totalTax.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 pl-4 border-b border-slate-200">
            <span className="text-sm text-slate-600">+ Discount Given</span>
            <span className="text-sm text-amber-600">
              RM {current.totalDiscount.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 bg-slate-50 rounded-lg px-4">
            <span className="text-sm font-semibold text-slate-900">
              Calculated Total
            </span>
            <span className="text-sm font-bold text-slate-900">
              RM{" "}
              {(
                current.captainRevenue +
                current.platformRevenue +
                current.paymentGatewayFee +
                current.totalTax +
                current.totalDiscount
              ).toFixed(2)}
            </span>
          </div>
          {Math.abs(
            current.totalRevenue -
              (current.captainRevenue +
                current.platformRevenue +
                current.paymentGatewayFee +
                current.totalTax +
                current.totalDiscount)
          ) < 0.01 ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Balance verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>Balance mismatch detected</span>
            </div>
          )}
        </div>
      </div>

      {/* Comparison summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Period Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              Current Period
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Sales:</span>
                <span className="font-semibold">
                  RM {current.totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Fishon Revenue:</span>
                <span className="font-semibold">
                  RM {current.platformRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Bookings:</span>
                <span className="font-semibold">{current.bookingCount}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-2">
              Previous Period
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Sales:</span>
                <span className="font-semibold">
                  RM {previous.totalRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Fishon Revenue:</span>
                <span className="font-semibold">
                  RM {previous.platformRevenue.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Bookings:</span>
                <span className="font-semibold">{previous.bookingCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
