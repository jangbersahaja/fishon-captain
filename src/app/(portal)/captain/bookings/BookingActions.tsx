"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  bookingId: string;
};

const COMMON_REJECTION_REASONS = [
  "Unavailable on selected dates",
  "Charter maintenance scheduled",
  "Weather concerns",
  "Maximum capacity exceeded",
  "Insufficient notice period",
  "Other (please specify)",
];

export function BookingActions({ bookingId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(
    COMMON_REJECTION_REASONS[0]
  );
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  const handleApprove = () => {
    setError("");
    startTransition(async () => {
      try {
        const res = await fetch("/api/market/bookings/approve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: bookingId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to approve booking");
          return;
        }

        setShowApproveModal(false);
        router.refresh();
      } catch (e) {
        console.error("Approve failed", e);
        setError("Network error. Please try again.");
      }
    });
  };

  const handleReject = () => {
    setError("");
    const finalReason =
      selectedReason === "Other (please specify)"
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      setError("Please provide a rejection reason");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/market/bookings/reject", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: bookingId, reason: finalReason }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Failed to reject booking");
          return;
        }

        setShowRejectModal(false);
        router.refresh();
      } catch (e) {
        console.error("Reject failed", e);
        setError("Network error. Please try again.");
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center flex-1 w-full gap-2">
        <Button
          size="sm"
          onClick={() => setShowApproveModal(true)}
          disabled={isPending}
          className="flex-1 text-white bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-1.5" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setShowRejectModal(true)}
          disabled={isPending}
          className="flex-1"
        >
          <XCircle className="h-4 w-4 mr-1.5" />
          Reject
        </Button>
      </div>

      {/* Approve Confirmation Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Approve Booking
            </DialogTitle>
            <DialogDescription>
              Payment has been received and secured. Approving will confirm the
              booking and capture the payment. The customer will be notified.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowApproveModal(false);
                setError("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="text-white bg-green-600 hover:bg-green-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Approval
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Reject Booking
            </DialogTitle>
            <DialogDescription>
              Please select a reason for rejecting this booking. The payment
              will be refunded to the customer, and they will receive your
              explanation.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-3"
            >
              {COMMON_REJECTION_REASONS.map((reason) => (
                <div key={reason} className="flex items-start space-x-2">
                  <RadioGroupItem
                    value={reason}
                    id={reason}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={reason}
                    className="font-normal leading-snug cursor-pointer"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {selectedReason === "Other (please specify)" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Custom Reason</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="Please provide a specific reason..."
                  value={customReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCustomReason(e.target.value)
                  }
                  className="min-h-[100px] resize-none"
                  disabled={isPending}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRejectModal(false);
                setError("");
                setSelectedReason(COMMON_REJECTION_REASONS[0]);
                setCustomReason("");
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
