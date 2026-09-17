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
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  bookingId: string;
  currentDate: Date;
  charterName?: string;
};

export function RescheduleDialog({ bookingId, currentDate, charterName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    currentDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  // Tomorrow in MYT (UTC+8) — avoids UTC offset returning yesterday during 00:00–07:59 MYT
  const mytNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  mytNow.setUTCDate(mytNow.getUTCDate() + 1);
  const minDate = mytNow.toISOString().split("T")[0];

  function handleOpenChange(next: boolean) {
    if (!isPending) {
      setOpen(next);
      if (!next) {
        setError("");
        setSelectedDate(
          currentDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" })
        );
        setReason("");
      }
    }
  }

  function handleSubmit() {
    setError("");
    if (!selectedDate) {
      setError("Please select a date");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/market/bookings/reschedule", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: bookingId,
            date: selectedDate,
            reason: reason.trim() || undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Failed to reschedule");
          return;
        }
        setOpen(false);
        router.refresh();
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-300"
      >
        <Calendar className="h-4 w-4 mr-1.5" />
        Reschedule Booking
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Calendar className="w-5 h-5" />
              Reschedule Booking
            </DialogTitle>
            <DialogDescription>
              Reschedule{charterName ? ` ${charterName}` : " this booking"} to a new date.
              Angler and captain will be notified by email.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="reschedule-date">
                New Date <span className="text-red-500">*</span>
              </Label>
              <input
                id="reschedule-date"
                type="date"
                value={selectedDate}
                min={minDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={isPending}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-reason">
                Reason <span className="text-slate-400 font-normal">(shown in email)</span>
              </Label>
              <Textarea
                id="reschedule-reason"
                placeholder="e.g. Weather conditions, captain request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPending}
                className="resize-none min-h-[80px]"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-800 border border-red-200 rounded-lg bg-red-50">
                {error}
              </div>
            )}

            <div className="p-3 text-xs text-amber-800 border border-amber-200 rounded-lg bg-amber-50">
              ⚠️ Both the angler and captain will receive a rescheduling notification email.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Rescheduling...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Reschedule & Notify
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
