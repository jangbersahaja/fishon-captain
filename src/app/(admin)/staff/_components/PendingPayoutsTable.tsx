"use client";

import { format } from "date-fns";

interface PayoutCalculation {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  totalEarnings: number;
  bookingCount: number;
  bookingIds: string[];
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  // Eligibility tracking
  eligibleEarnings: number;
  eligibleBookingCount: number;
  eligibleBookingIds: string[];
  oldestTripDate: Date | null;
  newestEligibleDate: Date | null;
}

interface PendingPayoutsTableProps {
  calculations: PayoutCalculation[];
}

export function PendingPayoutsTable({
  calculations,
}: PendingPayoutsTableProps) {
  if (calculations.length === 0) {
    return (
      <div className="p-8 text-center border border-slate-200 rounded-lg bg-slate-50">
        <p className="text-slate-600">No pending payouts</p>
        <p className="mt-1 text-sm text-slate-500">
          All captain earnings have been processed
        </p>
      </div>
    );
  }

  // Summary stats
  const totalEligible = calculations.reduce(
    (sum, c) => sum + c.eligibleEarnings,
    0
  );
  const totalPending = calculations.reduce(
    (sum, c) => sum + c.totalEarnings,
    0
  );
  const captainsWithEligible = calculations.filter(
    (c) => c.eligibleEarnings > 0
  ).length;

  return (
    <div className="space-y-4">
      {/* Eligibility Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Ready for Payout (3+ business days since trip)
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-900">
              RM {totalEligible.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700">
              {captainsWithEligible} captain(s) with eligible earnings
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">Total Pending</p>
            <p className="text-lg font-semibold text-blue-800">
              RM {totalPending.toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">(includes not yet eligible)</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-900">
                Captain
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-900">
                Bank Details
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-900">
                Bookings
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-900">
                Eligible
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-900">
                Total Pending
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {calculations.map((calc) => {
              const hasBankDetails =
                calc.bankName && calc.accountNumber && calc.accountHolder;
              const hasEligible = calc.eligibleEarnings > 0;
              const isReady = hasBankDetails && hasEligible;

              return (
                <tr
                  key={calc.ownerId}
                  className={
                    !hasBankDetails
                      ? "bg-amber-50"
                      : hasEligible
                        ? "bg-green-50"
                        : ""
                  }
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {calc.ownerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {calc.ownerEmail}
                      </div>
                      {calc.oldestTripDate && (
                        <div className="text-xs text-slate-400 mt-1">
                          Oldest trip:{" "}
                          {format(new Date(calc.oldestTripDate), "d MMM yyyy")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {hasBankDetails ? (
                      <div className="text-xs">
                        <div className="font-medium">{calc.bankName}</div>
                        <div className="text-slate-500">
                          {calc.accountNumber!.replace(/(\d{4})(?=\d)/g, "$1 ")}
                        </div>
                        <div className="text-slate-500">
                          {calc.accountHolder}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-600">
                          Missing
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-slate-900">
                      {calc.eligibleBookingCount > 0 && (
                        <span className="font-semibold text-green-700">
                          {calc.eligibleBookingCount} eligible
                        </span>
                      )}
                      {calc.eligibleBookingCount > 0 &&
                        calc.bookingCount > calc.eligibleBookingCount && (
                          <span className="text-slate-400"> / </span>
                        )}
                      {calc.bookingCount > calc.eligibleBookingCount && (
                        <span className="text-slate-500">
                          {calc.bookingCount - calc.eligibleBookingCount}{" "}
                          pending
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {calc.eligibleEarnings > 0 ? (
                      <span className="font-semibold text-green-700">
                        RM {calc.eligibleEarnings.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    RM {calc.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!hasBankDetails ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        No Bank
                      </span>
                    ) : isReady ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        Not Eligible
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={2}>
                Total
              </td>
              <td className="px-4 py-3 text-center">
                {calculations.reduce(
                  (sum, c) => sum + c.eligibleBookingCount,
                  0
                )}{" "}
                eligible /
                {calculations.reduce((sum, c) => sum + c.bookingCount, 0)} total
              </td>
              <td className="px-4 py-3 text-right text-green-700">
                RM {totalEligible.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                RM {totalPending.toLocaleString()}
              </td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Policy Note */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <strong>Payout Policy:</strong> Bookings become eligible 3 business days
        after trip completion. Only process payouts for &quot;Ready&quot;
        captains (eligible earnings + bank details complete).
      </div>
    </div>
  );
}
