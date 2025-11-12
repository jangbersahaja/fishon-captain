"use client";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { PayoutStatusBadge } from "./PayoutStatusBadge";

interface PayoutTableProps {
  payouts: Array<{
    id: string;
    batchId: string;
    ownerId: string;
    ownerName: string;
    ownerEmail: string;
    bookingCount: number;
    netPayout: number;
    status:
      | "PENDING"
      | "APPROVED"
      | "PROCESSING"
      | "COMPLETED"
      | "FAILED"
      | "CANCELLED";
    bankName: string | null;
    accountNumber: string | null;
    scheduledAt: Date | null;
    createdAt: Date;
  }>;
}

export function PayoutTable({ payouts }: PayoutTableProps) {
  if (payouts.length === 0) {
    return (
      <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50">
        <p className="text-slate-600">No payouts found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-900">
              Batch ID
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-900">
              Captain
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-900">
              Bank Details
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-900">
              Bookings
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-900">
              Net Payout
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-900">
              Status
            </th>
            <th className="px-4 py-3 text-left font-medium text-slate-900">
              Created
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/staff/finance/payouts/${payout.id}`}
                  className="font-mono text-blue-600 hover:underline"
                >
                  {payout.batchId}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-slate-900">
                    {payout.ownerName}
                  </div>
                  <div className="text-xs text-slate-500">
                    {payout.ownerEmail}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                {payout.bankName && payout.accountNumber ? (
                  <div className="text-xs">
                    <div className="font-medium">{payout.bankName}</div>
                    <div className="text-slate-500">
                      {payout.accountNumber.replace(/(\d{4})(?=\d)/g, "$1 ")}
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-red-600">Missing</span>
                )}
              </td>
              <td className="px-4 py-3 text-right text-slate-900">
                {payout.bookingCount}
              </td>
              <td className="px-4 py-3 text-right font-medium text-slate-900">
                RM {payout.netPayout.toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <PayoutStatusBadge status={payout.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDistanceToNow(new Date(payout.createdAt), {
                  addSuffix: true,
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/staff/finance/payouts/${payout.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
