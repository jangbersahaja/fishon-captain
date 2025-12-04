"use client";

import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AddBankInfoDialog } from "./AddBankInfoDialog";
import { ProcessPayoutButton } from "./ProcessPayoutButton";

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
  // Trip date info
  oldestTripDate: Date | null;
}

interface PendingPayoutsTableProps {
  calculations: PayoutCalculation[];
}

export function PendingPayoutsTable({
  calculations,
}: PendingPayoutsTableProps) {
  const [selectedOwners, setSelectedOwners] = useState<Set<string>>(new Set());

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
  const totalPending = calculations.reduce(
    (sum, c) => sum + c.totalEarnings,
    0
  );
  const totalBookings = calculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );
  const captainsWithBank = calculations.filter(
    (c) => c.bankName && c.accountNumber && c.accountHolder
  ).length;
  const captainsMissingBank = calculations.length - captainsWithBank;

  // Selected calculations
  const selectedCalculations = calculations.filter((c) =>
    selectedOwners.has(c.ownerId)
  );
  const selectedTotal = selectedCalculations.reduce(
    (sum, c) => sum + c.totalEarnings,
    0
  );
  const selectedBookings = selectedCalculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );

  // Only allow selection of captains with bank details
  const selectableCalculations = calculations.filter(
    (c) => c.bankName && c.accountNumber && c.accountHolder
  );

  const toggleOwner = (ownerId: string) => {
    const newSelected = new Set(selectedOwners);
    if (newSelected.has(ownerId)) {
      newSelected.delete(ownerId);
    } else {
      newSelected.add(ownerId);
    }
    setSelectedOwners(newSelected);
  };

  const toggleAll = () => {
    if (selectedOwners.size === selectableCalculations.length) {
      setSelectedOwners(new Set());
    } else {
      setSelectedOwners(new Set(selectableCalculations.map((c) => c.ownerId)));
    }
  };

  const clearSelection = () => {
    setSelectedOwners(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-900">
              Total Pending Payouts
            </p>
            <p className="mt-1 text-2xl font-bold text-blue-800">
              RM {totalPending.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700">
              {totalBookings} booking(s) from {calculations.length} captain(s)
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-right">
            <div>
              <p className="text-xs text-green-600">Ready (Bank OK)</p>
              <p className="text-lg font-semibold text-green-700">
                {captainsWithBank}
              </p>
            </div>
            <div>
              <p className="text-xs text-red-600">Missing Bank</p>
              <p className="text-lg font-semibold text-red-700">
                {captainsMissingBank}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Summary & Process Button */}
      {selectedOwners.size > 0 && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-green-900">
                Selected for Payout
              </p>
              <p className="mt-1 text-xl font-bold text-green-800">
                RM {selectedTotal.toLocaleString()}
              </p>
              <p className="text-xs text-green-700">
                {selectedBookings} booking(s) from {selectedOwners.size}{" "}
                captain(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Clear
              </button>
              <ProcessPayoutButton
                calculations={selectedCalculations}
                onSuccess={clearSelection}
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    selectableCalculations.length > 0 &&
                    selectedOwners.size === selectableCalculations.length
                  }
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  title="Select all captains with bank details"
                />
              </th>
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
                Amount
              </th>
              <th className="px-4 py-3 text-center font-medium text-slate-900">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-slate-900">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {calculations.map((calc) => {
              const hasBankDetails =
                calc.bankName && calc.accountNumber && calc.accountHolder;
              const isSelected = selectedOwners.has(calc.ownerId);

              return (
                <tr
                  key={calc.ownerId}
                  className={
                    isSelected
                      ? "bg-green-50"
                      : !hasBankDetails
                        ? "bg-amber-50"
                        : ""
                  }
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOwner(calc.ownerId)}
                      disabled={!hasBankDetails}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        hasBankDetails
                          ? "Select for payout"
                          : "Cannot select: missing bank details"
                      }
                    />
                  </td>
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
                          Trip:{" "}
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
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-red-600">
                          Missing
                        </span>
                        <AddBankInfoDialog
                          ownerId={calc.ownerId}
                          ownerName={calc.ownerName}
                          ownerEmail={calc.ownerEmail}
                        />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-medium">{calc.bookingCount}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    RM {calc.totalEarnings.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!hasBankDetails ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                        No Bank
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        Ready
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/staff/verification/${calc.ownerId}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      title="View verification details"
                    >
                      View
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3 text-center">{totalBookings}</td>
              <td className="px-4 py-3 text-right">
                RM {totalPending.toLocaleString()}
              </td>
              <td className="px-4 py-3" colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info Note */}
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
        <strong>How to process payouts:</strong>
        <ol className="mt-1 space-y-0.5 list-decimal list-inside">
          <li>Select one or more captains using the checkboxes</li>
          <li>Review the total amount in the green selection bar</li>
          <li>
            Click &quot;Process Payout Now&quot; to create the payout batch
          </li>
          <li>
            After creating, go to the payout detail page to adjust deductions if
            needed
          </li>
        </ol>
        <p className="mt-2 text-slate-500">
          💡 Captains see &quot;Payment will be processed within 3-5 business
          days after trip&quot; as a buffer for payment gateway delays and
          verification.
        </p>
      </div>
    </div>
  );
}
