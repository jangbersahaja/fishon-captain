import { format } from "date-fns";

interface Booking {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerEmail: string;
  charterName: string;
  tripDate: Date;
  tripName: string;
  totalAmount: string;
  earnings: string;
  commission: string;
  commissionRate: number;
}

interface PayoutBookingListProps {
  bookings: Booking[];
}

export function PayoutBookingList({ bookings }: PayoutBookingListProps) {
  const totalEarnings = bookings.reduce(
    (sum, b) => sum + Number(b.earnings),
    0
  );

  const totalCommission = bookings.reduce(
    (sum, b) => sum + Number(b.commission),
    0
  );

  const totalAmount = bookings.reduce(
    (sum, b) => sum + Number(b.totalAmount),
    0
  );

  if (bookings.length === 0) {
    return (
      <div className="p-6 bg-white border rounded-lg shadow-sm border-slate-200">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Booking Breakdown
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
        Booking Breakdown
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
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Booking
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Customer
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Charter & Trip
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-slate-600">
                Trip Date
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Total
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Commission
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-slate-600">
                Earnings
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-900">
                  <p className="font-medium">{booking.bookingNumber}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-slate-500">{booking.customerEmail}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  <p className="font-medium">{booking.charterName}</p>
                  <p className="text-slate-500">{booking.tripName}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-900">
                  {format(new Date(booking.tripDate), "MMM d, yyyy")}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right text-slate-900">
                  RM {Number(booking.totalAmount).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-right text-red-600">
                  -RM {Number(booking.commission).toLocaleString()}
                  <span className="block text-xs text-slate-500">
                    ({booking.commissionRate}%)
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-right text-green-600">
                  RM {Number(booking.earnings).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50">
            <tr>
              <td
                colSpan={4}
                className="px-4 py-3 text-sm font-semibold text-right text-slate-900"
              >
                Total:
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900">
                RM {totalAmount.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-right text-red-600">
                -RM {totalCommission.toLocaleString()}
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
          <div
            key={booking.id}
            className="p-4 border rounded-lg border-slate-200"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {booking.bookingNumber}
                </p>
                <p className="text-xs text-slate-500">{booking.customerName}</p>
              </div>
              <p className="text-sm font-semibold text-green-600">
                RM {Number(booking.earnings).toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">
                <span className="font-medium">{booking.charterName}</span> •{" "}
                {booking.tripName}
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(booking.tripDate), "MMM d, yyyy")}
              </p>
              <div className="flex justify-between pt-2 mt-2 text-xs border-t border-slate-200">
                <span className="text-slate-600">
                  Total: RM {Number(booking.totalAmount).toLocaleString()}
                </span>
                <span className="text-red-600">
                  Commission: -RM {Number(booking.commission).toLocaleString()}{" "}
                  ({booking.commissionRate}%)
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Total */}
        <div className="p-4 border-2 rounded-lg border-slate-300 bg-slate-50">
          <div className="flex justify-between mb-2 text-sm">
            <span className="font-semibold text-slate-900">Total Amount:</span>
            <span className="font-semibold text-slate-900">
              RM {totalAmount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between mb-2 text-sm">
            <span className="text-slate-600">Total Commission:</span>
            <span className="text-red-600">
              -RM {totalCommission.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between pt-2 text-sm border-t border-slate-300">
            <span className="font-semibold text-slate-900">Your Earnings:</span>
            <span className="font-semibold text-green-600">
              RM {totalEarnings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
