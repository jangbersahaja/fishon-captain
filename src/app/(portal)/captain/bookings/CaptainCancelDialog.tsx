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
import { AlertTriangle, Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  bookingId: string;
  charterName?: string;
};

const CANCELLATION_REASONS = [
  "Boat maintenance / engine failure",
  "Captain illness or emergency",
  "Unsafe weather conditions (outside of forecast)",
  "Crew unavailability",
  "Double booking error",
  "Other (please specify)",
];

/**
 * Captain Cancel Dialog
 *
 * Used for CONFIRMED (PAID) bookings that captain needs to cancel.
 * Per policy:
 * - Captain must provide a detailed reason
 * - Angler receives FULL refund (100%)
 * - Captain bears all refund costs
 *
 * This is DIFFERENT from rejection:
 * - Rejection: Before payment confirmation
 * - Captain Cancellation: After payment confirmation
 */
export function CaptainCancelDialog({ bookingId, charterName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [error, setError] = useState("");

  const handleCancel = () => {
    setError("");

    const finalReason =
      selectedReason === "Other (please specify)"
        ? customReason.trim()
        : selectedReason;

    if (!finalReason || finalReason.length < 10) {
      setError(
        "Please provide a detailed cancellation reason (minimum 10 characters)"
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/market/bookings/captain-cancel", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: bookingId, reason: finalReason }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          if (data.refundError) {
            setError(
              "Payment refund failed. Please contact support for manual refund processing."
            );
            return;
          }

          setError(data.error || "Failed to cancel booking");
          return;
        }

        setShowModal(false);
        router.refresh();
      } catch (e) {
        console.error("Cancel failed", e);
        setError("Network error. Please try again.");
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setShowModal(true)}
        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
      >
        <Ban className="h-4 w-4 mr-1.5" />
        Cancel Booking
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Cancel Confirmed Booking
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                You are about to cancel a <strong>confirmed and paid</strong>{" "}
                booking{charterName ? ` for ${charterName}` : ""}.
              </p>
              <p className="p-2 text-sm rounded text-amber-800 bg-amber-50">
                <strong>⚠️ Important:</strong> The customer will receive a{" "}
                <strong>full refund</strong>. You will bear the refund costs as
                per our policy.
              </p>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Reason for cancellation <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={selectedReason}
                onValueChange={setSelectedReason}
                className="space-y-3"
              >
                {CANCELLATION_REASONS.map((reason) => (
                  <div key={reason} className="flex items-start space-x-2">
                    <RadioGroupItem
                      value={reason}
                      id={`cancel-${reason}`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`cancel-${reason}`}
                      className="font-normal leading-snug cursor-pointer"
                    >
                      {reason}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {selectedReason === "Other (please specify)" && (
              <div className="space-y-2">
                <Label htmlFor="custom-cancel-reason">
                  Detailed Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="custom-cancel-reason"
                  placeholder="Please provide a detailed explanation (minimum 10 characters)..."
                  value={customReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setCustomReason(e.target.value)
                  }
                  className="min-h-[100px] resize-none"
                  disabled={isPending}
                />
                <p className="text-xs text-slate-500">
                  {customReason.length}/10 characters minimum
                </p>
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
                setShowModal(false);
                setError("");
                setSelectedReason(CANCELLATION_REASONS[0]);
                setCustomReason("");
              }}
              disabled={isPending}
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Confirm Cancellation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
