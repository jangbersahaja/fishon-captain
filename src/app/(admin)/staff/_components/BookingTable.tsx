"use client";

import type { BookingFinancial } from "@/lib/services/finance-service";
import Link from "next/link";

export interface BookingTableTotals {
  grossRevenue: number;
  discount: number;
  tripIncome: number;
  serviceIncome: number;
  paymentGateway: number;
  captainEarnings: number;
}

interface BookingTableProps {
  bookings: BookingFinancial[];
  totals?: BookingTableTotals;
}

export function BookingTable({ bookings, totals }: BookingTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg border-slate-200 bg-slate-50">
        <p className="text-slate-600">No bookings found</p>
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
                Booking ID
              </th>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Charter
              </th>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Angler
              </th>
              <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                Trip Date
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Total (Gross)
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Discount
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Trip Income
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Service
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Gateway
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Captain
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Payout
              </th>
              <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-sm text-slate-600">
                  {booking.id.substring(0, 8)}...
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {booking.charterName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {booking.anglerName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(booking.tripDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right text-blue-600">
                  RM{" "}
                  {(
                    booking.finalPrice + (booking.discountAmount || 0)
                  ).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-amber-600">
                  {booking.discountAmount
                    ? `- RM ${booking.discountAmount.toLocaleString()}`
                    : "-"}
                </td>
                <td className="px-4 py-3 text-sm text-right text-emerald-600">
                  RM {booking.tripIncome.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-emerald-500">
                  RM {booking.serviceIncome.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-500">
                  RM {booking.paymentGatewayFee.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-purple-600">
                  RM {booking.captainEarnings.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <BookingStatusBadge status={booking.status} />
                </td>
                <td className="px-4 py-3 text-center">
                  <PayoutStatusBadge status={booking.payoutStatus} />
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/staff/bookings/${booking.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
          {totals && (
            <tfoot className="border-t-2 bg-slate-100 border-slate-300">
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-3 text-sm font-semibold text-right text-slate-700"
                >
                  Total ({bookings.length} bookings)
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-blue-700">
                  RM {totals.grossRevenue.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-amber-700">
                  - RM {totals.discount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-emerald-700">
                  RM {totals.tripIncome.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-emerald-600">
                  RM {totals.serviceIncome.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-slate-600">
                  RM {totals.paymentGateway.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm font-semibold text-right text-purple-700">
                  RM {totals.captainEarnings.toLocaleString()}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function BookingStatusBadge({ status }: { status: string }) {
  // Matching BookingStatus enum from database
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    AWAITING_PAYMENT: "bg-blue-100 text-blue-800",
    PAYMENT_AUTHORIZED: "bg-cyan-100 text-cyan-800",
    PAID: "bg-green-100 text-green-800",
    UNDER_REVIEW: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
    EXPIRED: "bg-slate-100 text-slate-800",
  };

  const color =
    colors[status as keyof typeof colors] || "bg-slate-100 text-slate-600";

  // Display friendly labels
  const displayLabels: Record<string, string> = {
    PENDING: "PENDING",
    AWAITING_PAYMENT: "AWAITING PAY",
    PAYMENT_AUTHORIZED: "AUTHORIZED",
    UNDER_REVIEW: "REVIEW",
  };
  const displayLabel = displayLabels[status] || status;

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {displayLabel}
    </span>
  );
}

function PayoutStatusBadge({ status }: { status: string | null }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    ON_HOLD: "bg-slate-100 text-slate-800",
  };

  const color = status
    ? colors[status as keyof typeof colors]
    : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {status || "N/A"}
    </span>
  );
}
