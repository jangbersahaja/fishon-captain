"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayoutCancelButtonProps {
  payoutId: string;
  status: string;
}

export function PayoutCancelButton({
  payoutId,
  status,
}: PayoutCancelButtonProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    const reason = prompt(
      "Please provide a reason for cancellation (optional):"
    );

    if (
      !confirm(
        "Are you sure you want to cancel this payout?\n\nThis will:\n• Mark the payout as CANCELLED\n• Reset bookings back to PENDING payout status\n• Allow these bookings to be included in a future payout batch"
      )
    ) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/finance/payouts/${payoutId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || undefined }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel payout");
      }

      router.refresh();
      alert(
        "Payout cancelled successfully. Bookings are now available for a new payout batch."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsCancelling(false);
    }
  };

  // Only show cancel button for PENDING or APPROVED status
  // Cannot cancel PROCESSING, COMPLETED, or already CANCELLED payouts
  if (status !== "PENDING" && status !== "APPROVED") {
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
        onClick={handleCancel}
        disabled={isCancelling}
        className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCancelling ? "Cancelling..." : "Cancel Payout"}
      </button>
    </div>
  );
}
