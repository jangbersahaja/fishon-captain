"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

interface CreatePayoutBatchButtonProps {
  calculations: PayoutCalculation[];
}

export function CreatePayoutBatchButton({
  calculations,
}: CreatePayoutBatchButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalAmount = calculations.reduce((sum, c) => sum + c.totalEarnings, 0);
  const totalBookings = calculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );

  const handleCreateBatch = async () => {
    if (
      !confirm(
        `Create payout batch for ${calculations.length} captain(s)?\n\nTotal: RM ${totalAmount.toLocaleString()}\nBookings: ${totalBookings}`
      )
    ) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/finance/payouts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payout batch");
      }

      router.refresh();
      alert(`Payout batch created successfully!\nBatch ID: ${data.batchId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCreating(false);
    }
  };

  if (calculations.length === 0) {
    return null;
  }

  // Check for missing bank details
  const missingBankDetails = calculations.filter(
    (c) => !c.bankName || !c.accountNumber || !c.accountHolder
  );

  return (
    <div className="space-y-4">
      {missingBankDetails.length > 0 && (
        <div className="p-4 border border-amber-200 rounded-lg bg-amber-50">
          <p className="text-sm text-amber-800">
            ⚠️ {missingBankDetails.length} captain(s) missing bank details. They
            will be excluded from the batch.
          </p>
        </div>
      )}

      {error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleCreateBatch}
        disabled={isCreating || calculations.length === 0}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? "Creating..." : "Create Payout Batch"}
      </button>

      <div className="text-sm text-slate-600">
        <p>Total: RM {totalAmount.toLocaleString()}</p>
        <p>Captains: {calculations.length}</p>
        <p>Bookings: {totalBookings}</p>
      </div>
    </div>
  );
}
