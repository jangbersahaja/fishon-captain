"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayoutApproveButtonProps {
  payoutId: string;
  status: string;
}

export function PayoutApproveButton({
  payoutId,
  status,
}: PayoutApproveButtonProps) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!confirm("Approve this payout for processing?")) {
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/finance/payouts/${payoutId}/approve`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve payout");
      }

      router.refresh();
      alert("Payout approved successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsApproving(false);
    }
  };

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        onClick={handleApprove}
        disabled={isApproving}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isApproving ? "Approving..." : "Approve Payout"}
      </button>
    </div>
  );
}
