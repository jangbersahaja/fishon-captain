"use client";

import { Button } from "@/components/ui/button";
import { overrideBookingStatus } from "@/lib/actions/staff-booking-actions";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "../../_components/ActionDialog";

interface StatusOverrideDialogProps {
  bookingId: string;
  currentStatus: string;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export function StatusOverrideDialog({
  bookingId,
  currentStatus,
  isProcessing,
  setIsProcessing,
}: StatusOverrideDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const statuses = [
    "PENDING",
    "AWAITING_PAYMENT",
    "PAYMENT_AUTHORIZED",
    "PAID",
    "UNDER_REVIEW",
    "COMPLETED",
    "REJECTED",
    "CANCELLED",
    "EXPIRED",
  ].filter((s) => s !== currentStatus);

  return (
    <div className="space-y-2">
      <select
        value={selectedStatus}
        onChange={(e) => setSelectedStatus(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <option value="">Select new status...</option>
        {statuses.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {selectedStatus && (
        <ActionDialog
          title="Override Booking Status"
          description={`Manually change status from ${currentStatus} to ${selectedStatus}. This bypasses all normal flow validations and should only be used to fix stuck bookings.`}
          action={async (password: string, reason: string) => {
            setIsProcessing(true);
            try {
              const result = await overrideBookingStatus(
                bookingId,
                password,
                selectedStatus,
                reason
              );
              if (result.success) {
                toast.success(result.message || "Status overridden");
                setSelectedStatus("");
              } else {
                toast.error(result.error || "Failed to override status");
              }
            } finally {
              setIsProcessing(false);
            }
          }}
          trigger={
            <Button
              variant="outline"
              size="sm"
              className="w-full border-orange-200 text-orange-700 hover:bg-orange-50"
              disabled={isProcessing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Override to {selectedStatus}
            </Button>
          }
          requireReason
        />
      )}
    </div>
  );
}
