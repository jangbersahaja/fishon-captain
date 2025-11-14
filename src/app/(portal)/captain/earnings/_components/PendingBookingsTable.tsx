import { format } from "date-fns";

interface Booking {
  id: string;
  charterName: string;
  anglerName: string;
  tripDate: Date;
  finalPrice: number;
  captainEarnings: number;
  platformFee: number;
  createdAt: Date;
}

interface PendingBookingsTableProps {
  bookings: Booking[];
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
                Angler
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Trip Date
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Paid On
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Booking Total
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Platform Fee
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Your Earnings
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">
                  {booking.charterName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {booking.anglerName}
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {format(new Date(booking.tripDate), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-sm text-slate-500">
                  {format(new Date(booking.createdAt), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-sm text-right text-slate-900">
                  RM {Number(booking.finalPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  -RM {Number(booking.platformFee).toLocaleString()}
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
                colSpan={6}
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
          <div
            key={booking.id}
            className="p-4 border rounded-lg border-slate-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {booking.charterName}
                </p>
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
                <span className="font-medium">Paid:</span>{" "}
                {format(new Date(booking.createdAt), "MMM d, yyyy")}
              </p>
              <div className="flex justify-between pt-2 mt-2 text-xs border-t border-slate-200">
                <span className="text-slate-600">
                  Total: RM {Number(booking.finalPrice).toLocaleString()}
                </span>
                <span className="text-red-600">
                  Fee: -RM {Number(booking.platformFee).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
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
