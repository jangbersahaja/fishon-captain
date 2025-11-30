import type { BookingFinancial } from "@/lib/services/finance-service";
import { format } from "date-fns";
import Link from "next/link";

interface PendingBookingsTableProps {
  bookings: BookingFinancial[];
}

export function PendingBookingsTable({ bookings }: PendingBookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="p-12 text-center bg-white border rounded-lg shadow-sm border-slate-200">
        <p className="text-sm font-medium text-slate-900">
          No pending bookings
        </p>
        <p className="mt-1 text-sm text-slate-500">
          All your earnings have been processed or are scheduled for payout.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm border-slate-200">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">
          Pending Bookings
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}{" "}
          awaiting payout
        </p>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden md:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
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
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td
                colSpan={5}
                className="px-4 py-3 text-sm font-semibold text-right text-slate-900"
              >
                Total Pending:
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                RM{" "}
                {bookings
                  .reduce((sum, b) => sum + Number(b.captainEarnings), 0)
                  .toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="p-4 space-y-3 md:hidden">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/captain/bookings/${booking.id}`}
            className="block p-4 border rounded-lg border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {booking.charterName}
                </p>
                <p className="text-xs text-slate-600">{booking.tripName}</p>
                <p className="text-xs text-slate-500">{booking.anglerName}</p>
              </div>
              <p className="text-sm font-semibold text-green-600">
                RM {Number(booking.captainEarnings).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">
                <span className="font-medium">Trip:</span>{" "}
                {format(new Date(booking.tripDate), "MMM d, yyyy")}
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-medium">Booked:</span>{" "}
                {format(new Date(booking.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </Link>
        ))}

        {/* Mobile Total */}
        <div className="p-4 border-2 rounded-lg border-slate-300 bg-slate-50">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-900">
              Total Pending Earnings:
            </span>
            <span className="font-semibold text-green-600">
              RM{" "}
              {bookings
                .reduce((sum, b) => sum + Number(b.captainEarnings), 0)
                .toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
