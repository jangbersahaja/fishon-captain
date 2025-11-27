"use client";

import { Button } from "@/components/ui/button";
import {
  forceApproveBooking,
  forceRejectBooking,
} from "@/lib/actions/staff-booking-actions";
import { CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ActionDialog } from "./ActionDialog";

interface QuickActionsProps {
  bookingId: string;
  status: string;
  guestName: string;
}

export function QuickActions({
  bookingId,
  status,
  guestName,
}: QuickActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (status !== "PENDING") {
    return null;
  }

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
      <ActionDialog
        title="Quick Approve Booking"
        description={`Force approve booking for ${guestName}. This will bypass captain approval and move the booking to payment stage.`}
        action={async (password: string, reason: string) => {
          setIsProcessing(true);
          try {
            const result = await forceApproveBooking(
              bookingId,
              password,
              reason
            );
            if (result.success) {
              toast.success(result.message || "Booking approved");
            } else {
              toast.error(result.error || "Failed to approve");
            }
          } finally {
            setIsProcessing(false);
          }
        }}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-green-200 text-green-700 hover:bg-green-50"
            disabled={isProcessing}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Approve
          </Button>
        }
        requireReason
      />

      <ActionDialog
        title="Quick Reject Booking"
        description={`Force reject booking for ${guestName}. This action cannot be undone.`}
        action={async (password: string, reason: string) => {
          setIsProcessing(true);
          try {
            const result = await forceRejectBooking(
              bookingId,
              password,
              reason
            );
            if (result.success) {
              toast.success(result.message || "Booking rejected");
            } else {
              toast.error(result.error || "Failed to reject");
            }
          } finally {
            setIsProcessing(false);
          }
        }}
        trigger={
          <Button
            variant="outline"
            size="sm"
            className="flex-1 border-red-200 text-red-700 hover:bg-red-50"
            disabled={isProcessing}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>
        }
        requireReason
      />
    </div>
  );
}
