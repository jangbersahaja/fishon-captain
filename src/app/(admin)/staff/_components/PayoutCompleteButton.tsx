"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayoutCompleteButtonProps {
  payoutId: string;
  status: string;
}

export function PayoutCompleteButton({
  payoutId,
  status,
}: PayoutCompleteButtonProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState("");

  const handleComplete = async () => {
    if (!transferReference.trim()) {
      setError("Transfer reference is required");
      return;
    }

    if (
      !confirm(
        `Mark this payout as completed?\n\nTransfer Reference: ${transferReference}`
      )
    ) {
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/finance/payouts/${payoutId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transferReference }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mark payout as completed");
      }

      router.refresh();
      alert("Payout marked as completed!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCompleting(false);
    }
  };

  if (status !== "APPROVED" && status !== "PROCESSING") {
    return null;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 text-sm border border-red-200 rounded-lg bg-red-50 text-red-800">
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          value={transferReference}
          onChange={(e) => setTransferReference(e.target.value)}
          placeholder="e.g., TXN20251204123456"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          disabled={isCompleting}
        />
      </div>

      <button
        onClick={handleComplete}
        disabled={isCompleting || !transferReference.trim()}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCompleting ? "Processing..." : "Mark as Completed"}
      </button>
    </div>
  );
}
