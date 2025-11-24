/**
 * Unavailability Modal Component
 *
 * Modal for blocking specific date ranges or editing existing blocks.
 */

"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { CharterUnavailability } from "@prisma/client";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UnavailabilityModalProps {
  charterId: string;
  isOpen: boolean;
  onClose: () => void;
  prefillDate?: Date;
  onSuccess?: () => void;
  editBlock?: CharterUnavailability | null;
}

const REASON_OPTIONS = [
  "Offline Booking",
  "Boat Maintenance",
  "No Crew Available",
  "Weather Concerns",
  "Personal Leave",
  "Other (please specify)",
];

export function UnavailabilityModal({
  charterId,
  isOpen,
  onClose,
  prefillDate,
  onSuccess,
  editBlock,
}: UnavailabilityModalProps) {
  const router = useRouter();
  const toasts = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  const [reasonType, setReasonType] = useState<string>("");
  const [customReason, setCustomReason] = useState("");

  const isEditMode = !!editBlock;

  // Initialize form with editBlock data or prefillDate
  useEffect(() => {
    if (editBlock) {
      const start = new Date(editBlock.startDate);
      const end = new Date(editBlock.endDate);

      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));

      // Detect if it's an all-day block
      // Heuristic: if times are 00:00 UTC (which might be local time depending on how it was saved)
      // Given previous implementation used new Date(dateString) which is UTC midnight,
      // and we want to maintain backward compatibility where those show as All Day.
      // We'll assume if it looks like a full day (start/end times align with day boundaries or are same), it's all day.
      // For now, we'll default to true unless we detect specific times that are NOT midnight.
      // Since we can't easily know the original timezone of the user who created it,
      // and the previous UI only supported dates, we default to All Day for existing blocks.
      // If we want to be smarter, we could check if hours/minutes are non-zero.
      const hasTime =
        start.getUTCHours() !== 0 ||
        start.getUTCMinutes() !== 0 ||
        end.getUTCHours() !== 0 ||
        end.getUTCMinutes() !== 0;

      // However, if the user is in a timezone where 00:00 UTC is 8am, then 00:00 UTC IS a specific time?
      // No, the previous UI saved "YYYY-MM-DD" as 00:00 UTC.
      // So 00:00 UTC effectively means "Date Only" in the old system.
      setIsAllDay(!hasTime);

      if (hasTime) {
        // Convert UTC to local time for inputs
        setStartTime(format(start, "HH:mm"));
        setEndTime(format(end, "HH:mm"));
      } else {
        setStartTime("08:00");
        setEndTime("18:00");
      }

      const r = editBlock.reason || "";
      if (REASON_OPTIONS.includes(r)) {
        setReasonType(r);
        setCustomReason("");
      } else if (r) {
        setReasonType("Other (please specify)");
        setCustomReason(r);
      } else {
        setReasonType("");
        setCustomReason("");
      }
    } else if (prefillDate) {
      setStartDate(format(prefillDate, "yyyy-MM-dd"));
      setEndDate(format(prefillDate, "yyyy-MM-dd"));
      setIsAllDay(true);
      setStartTime("08:00");
      setEndTime("18:00");
      setReasonType("");
      setCustomReason("");
    } else {
      setStartDate("");
      setEndDate("");
      setIsAllDay(true);
      setStartTime("08:00");
      setEndTime("18:00");
      setReasonType("");
      setCustomReason("");
    }
  }, [editBlock, prefillDate, isOpen]);

  const handleDelete = async () => {
    if (!editBlock) return;

    setIsDeleting(true);
    setShowDeleteConfirm(false);

    try {
      const response = await fetch(
        `/api/charters/${charterId}/unavailability`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unavailabilityId: editBlock.id }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove unavailability");
      }

      toasts.push({
        type: "success",
        message: "Unavailability block has been removed.",
        autoDismiss: 4000,
      });

      onSuccess?.();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error deleting unavailability:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to remove unavailability",
        autoDismiss: 6000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!startDate) {
      toasts.push({
        type: "error",
        message: "Please select a start date.",
        autoDismiss: 5000,
      });
      return;
    }

    const finalEndDate = endDate || startDate;
    let start: Date;
    let end: Date;

    if (isAllDay) {
      // For all-day, use UTC midnight to match previous behavior
      start = new Date(startDate);
      end = new Date(finalEndDate);
    } else {
      // For specific times, use local time construction
      if (!startTime || !endTime) {
        toasts.push({
          type: "error",
          message: "Please select start and end times.",
          autoDismiss: 5000,
        });
        return;
      }
      start = new Date(`${startDate}T${startTime}`);
      end = new Date(`${finalEndDate}T${endTime}`);
    }

    if (start > end) {
      toasts.push({
        type: "error",
        message: "End time cannot be before start time.",
        autoDismiss: 5000,
      });
      return;
    }

    const finalReason =
      reasonType === "Other (please specify)" ? customReason : reasonType;

    setIsLoading(true);

    try {
      const url = `/api/charters/${charterId}/unavailability`;
      const method = isEditMode ? "PATCH" : "POST";
      const body = {
        unavailabilityId: isEditMode ? editBlock?.id : undefined,
        startDate: isAllDay ? start.toISOString() : format(start, "yyyy-MM-dd"),
        endDate: isAllDay ? end.toISOString() : format(end, "yyyy-MM-dd"),
        isAllDay,
        startTime: isAllDay ? undefined : startTime,
        endTime: isAllDay ? undefined : endTime,
        reason: finalReason?.trim() || undefined,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save unavailability block");
      }

      const data = await response.json();

      toasts.push({
        type: "success",
        message: data.message || "Unavailability block saved successfully.",
        autoDismiss: 4000,
      });

      onSuccess?.();
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error saving unavailability:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to save block",
        autoDismiss: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Blocked Dates" : "Block Dates"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update the details of this unavailability block."
                : "Select a date range to block. Existing bookings will not be affected."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Block specific time Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="specific-time"
                checked={!isAllDay}
                onCheckedChange={(checked) => setIsAllDay(!checked)}
              />
              <Label htmlFor="specific-time">Block specific time</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Start Date */}
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || format(new Date(), "yyyy-MM-dd")}
                  placeholder="Same as start"
                />
              </div>
            </div>

            {/* Time Inputs */}
            {!isAllDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Reason Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="reason-type">Reason</Label>
              <Select value={reasonType} onValueChange={setReasonType}>
                <SelectTrigger id="reason-type">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom Reason Textarea */}
            {reasonType === "Other (please specify)" && (
              <div className="space-y-2">
                <Label htmlFor="custom-reason">Custom Reason</Label>
                <Textarea
                  id="custom-reason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g., Boat maintenance, Personal leave"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-slate-500">
                  {customReason.length}/200 characters
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
            {isEditMode ? (
              <>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting || isLoading}
                  className="w-full sm:w-auto"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </>
                  )}
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isDeleting || isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isDeleting || isLoading}
                    className="flex-1 sm:flex-none"
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Block Dates
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Unavailability Block"
        description="Are you sure you want to remove this unavailability block? This action cannot be undone."
        confirmText="Delete Block"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </>
  );
}
