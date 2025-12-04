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

interface ProcessPayoutButtonProps {
  calculations: PayoutCalculation[];
  onSuccess?: () => void;
}

export function ProcessPayoutButton({
  calculations,
  onSuccess,
}: ProcessPayoutButtonProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = calculations.reduce((sum, c) => sum + c.totalEarnings, 0);
  const totalBookings = calculations.reduce(
    (sum, c) => sum + c.bookingCount,
    0
  );

  const handleProcess = async () => {
    const confirmMsg = `Process payout for ${calculations.length} captain(s)?\n\nTotal: RM ${totalAmount.toLocaleString()}\nBookings: ${totalBookings}\n\nThis will create a payout batch for the selected captains.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    setIsProcessing(true);

    try {
      // Transform to batch format
      const batchCalculations = calculations.map((c) => ({
        ownerId: c.ownerId,
        ownerName: c.ownerName,
        ownerEmail: c.ownerEmail,
        totalEarnings: c.totalEarnings,
        bookingCount: c.bookingCount,
        bookingIds: c.bookingIds,
        bankName: c.bankName,
        accountNumber: c.accountNumber,
        accountHolder: c.accountHolder,
      }));

      const response = await fetch("/api/admin/finance/payouts/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calculations: batchCalculations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create payout batch");
      }

      router.refresh();
      onSuccess?.();
      alert(
        `Payout batch created successfully!\nBatch ID: ${data.batchId}\n\nYou can now review and adjust deductions in the payout detail page.`
      );
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (calculations.length === 0) {
    return null;
  }

  return (
    <button
      onClick={handleProcess}
      disabled={isProcessing || totalAmount === 0}
      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isProcessing ? "Processing..." : "Process Payout Now"}
    </button>
  );
}
