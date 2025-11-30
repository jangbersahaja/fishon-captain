import type { BookingFinancial } from "@/lib/services/finance-service";
import { format } from "date-fns";
import Link from "next/link";

interface PayoutBookingListProps {
  bookings: BookingFinancial[];
}

export function PayoutBookingList({ bookings }: PayoutBookingListProps) {
  const totalEarnings = bookings.reduce(
    (sum, b) => sum + Number(b.captainEarnings),
    0
  );

  if (bookings.length === 0) {
    return (
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Included Bookings
        </h2>
        <p className="text-sm text-slate-500">
          No bookings found for this payout.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Included Bookings
      </h2>
      <p className="mb-4 text-sm text-slate-600">
        {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}{" "}
        included in this payout
      </p>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden border rounded-lg md:block border-slate-200">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                Charter
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                Trip
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                Angler
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                Trip Date
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                Booked On
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right uppercase text-slate-500">
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
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
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
                <td className="px-4 py-3 text-sm text-slate-600">
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
                Total:
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-right text-green-600">
                RM {totalEarnings.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {bookings.map((booking) => (
          <Link
            key={booking.id}
            href={`/captain/bookings/${booking.id}`}
            className="block p-4 transition-colors border rounded-lg border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-blue-600">
                  {booking.charterName}
                </p>
                <p className="text-xs text-slate-500">{booking.tripName}</p>
              </div>
              <p className="text-sm font-semibold text-green-600">
                RM {Number(booking.captainEarnings).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">{booking.anglerName}</p>
              <p className="text-xs text-slate-500">
                Trip: {format(new Date(booking.tripDate), "MMM d, yyyy")} •
                Booked: {format(new Date(booking.createdAt), "MMM d, yyyy")}
              </p>
            </div>
          </Link>
        ))}

        {/* Mobile Total */}
        <div className="p-4 border-2 rounded-lg border-slate-300 bg-slate-50">
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-900">
              Total Earnings:
            </span>
            <span className="font-semibold text-green-600">
              RM {totalEarnings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
