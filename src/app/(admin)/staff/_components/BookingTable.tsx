"use client";

import type { BookingFinancial } from "@/lib/services/finance-service";
import Link from "next/link";

interface BookingTableProps {
  bookings: BookingFinancial[];
}

export function BookingTable({ bookings }: BookingTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50">
        <p className="text-slate-600">No bookings found</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-200 rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
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
                Revenue
              </th>
              <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                Commission
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
                <td className="px-4 py-3 text-sm font-mono text-slate-600">
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
                <td className="px-4 py-3 text-sm font-medium text-right text-slate-900">
                  RM {booking.finalPrice.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
                  RM {booking.platformFee.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-600">
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
                    href={`/staff/finance/bookings/${booking.id}`}
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

function BookingStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
    EXPIRED: "bg-slate-100 text-slate-800",
    COMPLETED: "bg-emerald-100 text-emerald-800",
  };

  const color =
    colors[status as keyof typeof colors] || "bg-slate-100 text-slate-600";

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {status}
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
