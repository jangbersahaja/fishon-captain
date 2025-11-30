import type { BookingFinancial } from "@/lib/services/finance-service";
import { format } from "date-fns";
import Link from "next/link";

interface RecentEarningsListProps {
  bookings: BookingFinancial[];
}

export function RecentEarningsList({ bookings }: RecentEarningsListProps) {
  if (bookings.length === 0) {
    return (
      <div className="p-6 text-center bg-white border rounded-lg border-slate-200">
        <p className="text-slate-600">No earnings yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Your earnings from completed bookings will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          Recent Earnings
        </h2>
        {bookings.length > 0 && (
          <Link
            href="/captain/earnings/pending"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all →
          </Link>
        )}
      </div>
      <div className="overflow-hidden bg-white border rounded-lg shadow-sm border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                  Charter
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                  Trip
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                  Angler
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                  Trip Date
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                  Booked On
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                  Your Earnings
                </th>
                <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-slate-600">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <Link
                      href={`/captain/bookings/${booking.id}`}
                      className="font-medium hover:text-blue-600 hover:underline"
                    >
                      {booking.charterName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {booking.tripName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {booking.anglerName}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(booking.tripDate), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {format(new Date(booking.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                    RM {Number(booking.captainEarnings).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PayoutStatusBadge
                      status={booking.payoutStatus || "PENDING"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
  };

  const labels = {
    PENDING: "Pending",
    SCHEDULED: "Scheduled",
    COMPLETED: "Paid",
  };

  const color = colors[status as keyof typeof colors] || colors.PENDING;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-medium rounded ${color}`}
    >
      {label}
    </span>
  );
}
