"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface PayoutDeductionFormProps {
  payoutId: string;
  currentDeductions: number;
  totalEarnings: number;
  status: string;
}

export function PayoutDeductionForm({
  payoutId,
  currentDeductions,
  totalEarnings,
  status,
}: PayoutDeductionFormProps) {
  const router = useRouter();
  const [deductions, setDeductions] = useState(currentDeductions.toString());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only allow editing for PENDING status
  const canEdit = status === "PENDING";

  const netPayout = totalEarnings - (parseFloat(deductions) || 0);

  const handleSave = async () => {
    const deductionAmount = parseFloat(deductions) || 0;

    if (deductionAmount < 0) {
      setError("Deductions cannot be negative");
      return;
    }

    if (deductionAmount >= totalEarnings) {
      setError("Deductions cannot exceed total earnings");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(
        `/api/admin/finance/payouts/${payoutId}/deductions`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deductions: deductionAmount }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update deductions");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm border border-red-200 rounded-lg bg-red-50 text-red-800">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 text-sm border border-green-200 rounded-lg bg-green-50 text-green-800">
          Deductions updated successfully!
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Total Earnings</span>
          <span className="font-medium text-slate-900">
            RM {totalEarnings.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">Deductions</span>
          {canEdit ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">RM</span>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                className="w-24 px-2 py-1 text-sm text-right border rounded border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
                disabled={isSaving}
              />
            </div>
          ) : (
            <span className="font-medium text-slate-900">
              RM {currentDeductions.toLocaleString()}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-900">Net Payout</span>
            <span className="text-xl font-bold text-green-600">
              RM {netPayout.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {canEdit && (
        <button
          onClick={handleSave}
          disabled={isSaving || parseFloat(deductions) === currentDeductions}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Update Deductions"}
        </button>
      )}

      {!canEdit && status !== "PENDING" && (
        <p className="text-xs text-center text-slate-500">
          Deductions can only be edited when status is PENDING
        </p>
      )}
    </div>
  );
}
