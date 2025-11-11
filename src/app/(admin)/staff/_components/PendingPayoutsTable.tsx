"use client";

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

  return (
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
            <th className="px-4 py-3 text-right font-medium text-slate-900">
              Bookings
            </th>
            <th className="px-4 py-3 text-right font-medium text-slate-900">
              Total Earnings
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

            return (
              <tr
                key={calc.ownerId}
                className={hasBankDetails ? "" : "bg-amber-50"}
              >
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {calc.ownerName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {calc.ownerEmail}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {hasBankDetails ? (
                    <div className="text-xs">
                      <div className="font-medium">{calc.bankName}</div>
                      <div className="text-slate-500">
                        {calc.accountNumber!.replace(/(\d{4})(?=\d)/g, "$1 ")}
                      </div>
                      <div className="text-slate-500">{calc.accountHolder}</div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-red-600">
                        Missing
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-900">
                  {calc.bookingCount}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  RM {calc.totalEarnings.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  {hasBankDetails ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                      Incomplete
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
            <td className="px-4 py-3 text-right">
              {calculations.reduce((sum, c) => sum + c.bookingCount, 0)}
            </td>
            <td className="px-4 py-3 text-right">
              RM{" "}
              {calculations
                .reduce((sum, c) => sum + c.totalEarnings, 0)
                .toLocaleString()}
            </td>
            <td className="px-4 py-3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
