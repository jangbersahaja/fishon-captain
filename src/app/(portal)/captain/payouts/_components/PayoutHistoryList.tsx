import { Payout } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

interface PayoutHistoryListProps {
  payouts: Payout[];
}

export function PayoutHistoryList({ payouts }: PayoutHistoryListProps) {
  if (payouts.length === 0) {
    return (
      <div className="p-6 text-center bg-white border rounded-lg border-slate-200">
        <p className="text-slate-600">No payout history yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Your completed payouts will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Payout History</h2>
      <div className="overflow-hidden bg-white border rounded-lg border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Batch ID
                </th>
                <th className="px-4 py-3 text-xs font-medium text-left text-slate-600">
                  Period
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Amount
                </th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                  Bookings
                </th>
                <th className="px-4 py-3 text-xs font-medium text-center text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium text-right text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-sm text-slate-600">
                    {payout.batchId}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {format(new Date(payout.periodStart), "MMM d")} -{" "}
                    {format(new Date(payout.periodEnd), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-right text-slate-900">
                    RM {Number(payout.netPayout).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-slate-600">
                    {payout.bookingCount}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PayoutStatusBadge status={payout.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/captain/payouts/${payout.id}`}
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
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: string }) {
  const colors = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSING: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
    CANCELLED: "bg-slate-100 text-slate-800",
  };

  const labels = {
    PENDING: "Pending",
    APPROVED: "Approved",
    PROCESSING: "Processing",
    COMPLETED: "Completed",
    FAILED: "Failed",
    CANCELLED: "Cancelled",
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
