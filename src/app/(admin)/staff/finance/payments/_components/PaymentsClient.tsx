"use client";

import { getPresetDateRange } from "@/lib/utils/date-range-utils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DateRangeFilter,
  type DateRangePreset,
} from "../../_components/DateRangeFilter";
import { FinanceNav } from "../../_components/FinanceNav";

export interface PaymentRecord {
  id: string;
  bookingId: string;
  charterName: string;
  anglerName: string;
  amount: number;
  paymentMethod: string | null;
  paymentFlow: string | null;
  paymentTransactionId: string | null;
  paymentIntentId: string | null;
  status: string;
  bookingStatus: string;
  paymentAuthorizedAt: Date | null;
  paymentCapturedAt: Date | null;
  paymentReleasedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  refundStatus: string | null;
  refundAmount: number | null;
  refundedAt: Date | null;
}

type PaymentStatusFilter =
  | ""
  | "AUTHORIZED"
  | "CAPTURED"
  | "RELEASED"
  | "PENDING"
  | "FAILED"
  | "REFUNDED";

type PaymentMethodFilter = "" | "CARD" | "FPX" | "EWALLET" | "MOCK";

export function PaymentsClient() {
  // Date range state
  const defaultRange = getPresetDateRange("30d");
  const [startDate, setStartDate] = useState<Date>(defaultRange.from);
  const [endDate, setEndDate] = useState<Date>(defaultRange.to);

  // Filter state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusFilter>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodFilter>("");

  // Data state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, paymentStatus, paymentMethod]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentMethod && { paymentMethod }),
      });

      const response = await fetch(`/api/admin/finance/payments?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }

      const result = await response.json();
      setPayments(result.payments || []);
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
    setPaymentStatus("");
    setPaymentMethod("");
    const range = getPresetDateRange("30d");
    setStartDate(range.from);
    setEndDate(range.to);
  };

  const hasFilters = paymentStatus !== "" || paymentMethod !== "";

  // Calculate summary stats
  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  const authorizedCount = payments.filter(
    (p) => p.paymentAuthorizedAt && !p.paymentCapturedAt
  ).length;
  const capturedCount = payments.filter((p) => p.paymentCapturedAt).length;
  const refundedCount = payments.filter((p) => p.refundStatus).length;
  const refundedAmount = payments.reduce(
    (sum, p) => sum + (p.refundAmount ?? 0),
    0
  );

  // Payment method breakdown
  const methodBreakdown = payments.reduce(
    (acc, p) => {
      const method = p.paymentMethod || "UNKNOWN";
      if (!acc[method]) acc[method] = { count: 0, amount: 0 };
      acc[method].count++;
      acc[method].amount += p.amount;
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  if (loading && payments.length === 0) {
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
            Payment Monitoring
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {payments.length} payment{payments.length !== 1 ? "s" : ""} · RM{" "}
            {totalAmount.toLocaleString()} total
            {loading && (
              <Loader2 className="inline-block w-3 h-3 ml-2 animate-spin" />
            )}
          </p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-slate-600">
              Authorized
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{authorizedCount}</p>
          <p className="text-xs text-slate-500">Pending capture</p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-600">Captured</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{capturedCount}</p>
          <p className="text-xs text-slate-500">Payment received</p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-slate-600">Refunded</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{refundedCount}</p>
          <p className="text-xs text-slate-500">
            RM {refundedAmount.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white border rounded-lg border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-600">
              Net Amount
            </span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            RM {(totalAmount - refundedAmount).toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">After refunds</p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Payment Methods
        </h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(methodBreakdown).map(([method, data]) => (
            <div
              key={method}
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-50"
            >
              <PaymentMethodBadge method={method} />
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {data.count} payments
                </p>
                <p className="text-xs text-slate-500">
                  RM {data.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Payment Status Filter */}
          <div>
            <label
              htmlFor="paymentStatus"
              className="block text-xs font-medium text-slate-700"
            >
              Payment Status
            </label>
            <select
              id="paymentStatus"
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as PaymentStatusFilter)
              }
              className="block w-full px-3 py-2 mt-1 text-sm bg-white border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="AUTHORIZED">Authorized (Pending Capture)</option>
              <option value="CAPTURED">Captured (Payment Received)</option>
              <option value="RELEASED">Released (Token Voided)</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <label
              htmlFor="paymentMethod"
              className="block text-xs font-medium text-slate-700"
            >
              Payment Method
            </label>
            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) =>
                setPaymentMethod(e.target.value as PaymentMethodFilter)
              }
              className="block w-full px-3 py-2 mt-1 text-sm bg-white border rounded-md border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              <option value="CARD">Card</option>
              <option value="FPX">FPX</option>
              <option value="EWALLET">E-Wallet</option>
              <option value="MOCK">Mock (Test)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border rounded-lg border-slate-200">
        <PaymentsTable payments={payments} />
      </div>
    </div>
  );
}

function PaymentsTable({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg border-slate-200 bg-slate-50">
        <p className="text-slate-600">No payments found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border rounded-lg border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-slate-50 border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Transaction
              </th>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Charter / Angler
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Amount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Method
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Flow
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Timeline
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-mono text-sm text-slate-600">
                    {payment.paymentTransactionId?.substring(0, 12) || "-"}
                  </div>
                  <div className="text-xs text-slate-400">
                    {payment.bookingId.substring(0, 8)}...
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-900">
                    {payment.charterName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {payment.anglerName}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="text-sm font-medium text-slate-900">
                    RM {payment.amount.toLocaleString()}
                  </div>
                  {payment.refundAmount && (
                    <div className="text-xs text-red-500">
                      - RM {payment.refundAmount.toLocaleString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <PaymentMethodBadge method={payment.paymentMethod} />
                </td>
                <td className="px-4 py-3 text-center">
                  <PaymentFlowBadge flow={payment.paymentFlow} />
                </td>
                <td className="px-4 py-3 text-center">
                  <PaymentStatusBadge payment={payment} />
                </td>
                <td className="px-4 py-3">
                  <PaymentTimeline payment={payment} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/staff/bookings/${payment.bookingId}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentMethodBadge({ method }: { method: string | null }) {
  const styles: Record<string, string> = {
    CARD: "bg-purple-100 text-purple-800",
    FPX: "bg-blue-100 text-blue-800",
    EWALLET: "bg-green-100 text-green-800",
    MOCK: "bg-slate-100 text-slate-600",
    UNKNOWN: "bg-slate-100 text-slate-600",
  };

  const displayMethod = method || "UNKNOWN";
  const style = styles[displayMethod] || styles.UNKNOWN;

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${style}`}
    >
      {displayMethod}
    </span>
  );
}

function PaymentFlowBadge({ flow }: { flow: string | null }) {
  const styles: Record<string, string> = {
    TOKENIZED: "bg-amber-100 text-amber-800",
    DIRECT: "bg-cyan-100 text-cyan-800",
  };

  if (!flow) {
    return <span className="text-xs text-slate-400">-</span>;
  }

  const style = styles[flow] || "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${style}`}
    >
      {flow}
    </span>
  );
}

function PaymentStatusBadge({ payment }: { payment: PaymentRecord }) {
  // Determine payment status based on dates
  let status = "PENDING";
  let style = "bg-slate-100 text-slate-600";
  let Icon = Clock;

  if (payment.refundStatus) {
    status = "REFUNDED";
    style = "bg-red-100 text-red-800";
    Icon = XCircle;
  } else if (payment.paymentReleasedAt) {
    status = "RELEASED";
    style = "bg-orange-100 text-orange-800";
    Icon = AlertCircle;
  } else if (payment.paymentCapturedAt || payment.paidAt) {
    status = "CAPTURED";
    style = "bg-emerald-100 text-emerald-800";
    Icon = CheckCircle;
  } else if (payment.paymentAuthorizedAt) {
    status = "AUTHORIZED";
    style = "bg-amber-100 text-amber-800";
    Icon = Clock;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${style}`}
    >
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function PaymentTimeline({ payment }: { payment: PaymentRecord }) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-1 text-xs">
      {payment.paymentAuthorizedAt && (
        <div className="flex items-center gap-1 text-amber-600">
          <Clock className="w-3 h-3" />
          Auth: {formatDate(payment.paymentAuthorizedAt)}
        </div>
      )}
      {(payment.paymentCapturedAt || payment.paidAt) && (
        <div className="flex items-center gap-1 text-emerald-600">
          <CheckCircle className="w-3 h-3" />
          Paid: {formatDate(payment.paymentCapturedAt || payment.paidAt)}
        </div>
      )}
      {payment.paymentReleasedAt && (
        <div className="flex items-center gap-1 text-orange-600">
          <AlertCircle className="w-3 h-3" />
          Released: {formatDate(payment.paymentReleasedAt)}
        </div>
      )}
      {payment.refundedAt && (
        <div className="flex items-center gap-1 text-red-600">
          <XCircle className="w-3 h-3" />
          Refund: {formatDate(payment.refundedAt)}
        </div>
      )}
      {!payment.paymentAuthorizedAt &&
        !payment.paymentCapturedAt &&
        !payment.paidAt && (
          <div className="text-slate-400">
            Created: {formatDate(payment.createdAt)}
          </div>
        )}
    </div>
  );
}
