/**
 * Unavailability Modal Component
 *
 * Modal for blocking specific date ranges or editing existing blocks.
 */

"use client";

import { useToasts } from "@/components/toast/ToastContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CharterUnavailability } from "@prisma/client";
import { addHours, format } from "date-fns";
import { Calendar as CalendarIcon, Info, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UnavailabilityModalProps {
  charterId: string;
  isOpen: boolean;
  onClose: () => void;
  prefillDate?: Date;
  onSuccess?: () => void;
  editBlock?: CharterUnavailability | null;
  trips: { id: string; name: string; durationHours: number }[];
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
  trips,
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

  // New State
  const [blockType, setBlockType] = useState<"ALL" | "TRIP">("ALL");
  const [selectedTripId, setSelectedTripId] = useState<string>("custom");
  const [isMultiDay, setIsMultiDay] = useState(false);

  const isEditMode = !!editBlock;

  // Initialize form with editBlock data or prefillDate
  useEffect(() => {
    if (editBlock) {
      const start = new Date(editBlock.startDate);
      const end = new Date(editBlock.endDate);

      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(end, "yyyy-MM-dd"));

      // Check if multi-day
      const isMulti = format(start, "yyyy-MM-dd") !== format(end, "yyyy-MM-dd");
      setIsMultiDay(isMulti);

      // Detect if it's an all-day block
      const hasTime = !editBlock.isAllDay;
      setIsAllDay(!hasTime);

      if (hasTime) {
        setStartTime(editBlock.startTime || format(start, "HH:mm"));
        setEndTime(editBlock.endTime || format(end, "HH:mm"));
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

      // Handle Trip Specific Block
      if (editBlock.tripId) {
        setBlockType("TRIP");
        setSelectedTripId(editBlock.tripId);
      } else {
        setBlockType("ALL");
        setSelectedTripId("custom");
      }
    } else if (prefillDate) {
      setStartDate(format(prefillDate, "yyyy-MM-dd"));
      setEndDate(format(prefillDate, "yyyy-MM-dd"));
      setIsMultiDay(false);
      setIsAllDay(true);
      setStartTime("08:00");
      setEndTime("18:00");
      setReasonType("");
      setCustomReason("");
      setBlockType("ALL");
      setSelectedTripId("custom");
    } else {
      setStartDate("");
      setEndDate("");
      setIsMultiDay(false);
      setIsAllDay(true);
      setStartTime("08:00");
      setEndTime("18:00");
      setReasonType("");
      setCustomReason("");
      setBlockType("ALL");
      setSelectedTripId("custom");
    }
  }, [editBlock, prefillDate, isOpen]);

  // Handle Trip Selection for Offline Booking
  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);

    if (tripId !== "custom") {
      const trip = trips.find((t) => t.id === tripId);
      if (trip && !isAllDay && startTime) {
        // Auto-calculate end time based on duration
        const [hours, minutes] = startTime.split(":").map(Number);
        const start = new Date();
        start.setHours(hours, minutes, 0, 0);
        const end = addHours(start, trip.durationHours);
        setEndTime(format(end, "HH:mm"));
      }
    }
  };

  // Update end time when start time changes if a trip is selected
  useEffect(() => {
    if (
      reasonType === "Offline Booking" &&
      selectedTripId !== "custom" &&
      !isAllDay &&
      startTime
    ) {
      const trip = trips.find((t) => t.id === selectedTripId);
      if (trip) {
        const [hours, minutes] = startTime.split(":").map(Number);
        const start = new Date();
        start.setHours(hours, minutes, 0, 0);
        const end = addHours(start, trip.durationHours);
        setEndTime(format(end, "HH:mm"));
      }
    }
  }, [startTime, selectedTripId, reasonType, isAllDay, trips]);

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

    const finalEndDate = isMultiDay ? endDate : startDate;
    if (isMultiDay && !endDate) {
      toasts.push({
        type: "error",
        message: "Please select an end date for multi-day block.",
        autoDismiss: 5000,
      });
      return;
    }

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
        tripId:
          blockType === "TRIP" ||
          (reasonType === "Offline Booking" && selectedTripId !== "custom")
            ? selectedTripId !== "custom"
              ? selectedTripId
              : undefined
            : undefined,
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

          <div className="py-4 space-y-6">
            {/* Block Type Selection */}
            <div className="space-y-3">
              <Label>What do you want to block?</Label>
              <RadioGroup
                value={blockType}
                onValueChange={(v) => setBlockType(v as "ALL" | "TRIP")}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ALL" id="block-all" />
                  <Label htmlFor="block-all" className="font-normal">
                    Entire Charter (All Trips)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="TRIP" id="block-trip" />
                  <Label htmlFor="block-trip" className="font-normal">
                    Specific Trip Only
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Trip Selection (if Block Type is TRIP) */}
            {blockType === "TRIP" && (
              <div className="p-3 space-y-2 border rounded-md bg-slate-50">
                <Label htmlFor="trip-select">Select Trip to Block</Label>
                <Select
                  value={selectedTripId}
                  onValueChange={setSelectedTripId}
                >
                  <SelectTrigger id="trip-select">
                    <SelectValue placeholder="Select a trip" />
                  </SelectTrigger>
                  <SelectContent>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name} ({trip.durationHours}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Only this trip will be unavailable. Other trips can still be
                  booked.
                </p>
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

            {/* Offline Booking Trip Selection */}
            {reasonType === "Offline Booking" && blockType === "ALL" && (
              <div className="p-3 space-y-2 border border-blue-100 rounded-md bg-blue-50">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="offline-trip-select"
                    className="text-blue-900"
                  >
                    Which trip was booked?
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-4 h-4 text-blue-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          Select a trip to auto-fill the duration. This helps
                          track which trips are popular even for offline
                          bookings.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Select value={selectedTripId} onValueChange={handleTripSelect}>
                  <SelectTrigger id="offline-trip-select">
                    <SelectValue placeholder="Select trip (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom / Other</SelectItem>
                    {trips.map((trip) => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.name} ({trip.durationHours}h)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <div className="pt-4 space-y-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Date & Time</Label>

                {/* Multi-day Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="multi-day"
                    checked={isMultiDay}
                    onCheckedChange={(c: boolean | "indeterminate") =>
                      setIsMultiDay(!!c)
                    }
                  />
                  <Label
                    htmlFor="multi-day"
                    className="font-normal cursor-pointer"
                  >
                    Multi-day
                  </Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div
                  className={isMultiDay ? "space-y-2" : "space-y-2 col-span-2"}
                >
                  <Label htmlFor="start-date">Start Date</Label>
                  <div className="relative">
                    <Input
                      id="start-date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={format(new Date(), "yyyy-MM-dd")}
                    />
                    <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* End Date - Only show if Multi-day */}
                {isMultiDay && (
                  <div className="space-y-2">
                    <Label htmlFor="end-date">End Date</Label>
                    <div className="relative">
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate || format(new Date(), "yyyy-MM-dd")}
                      />
                      <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              {/* Block specific time Toggle */}
              <div className="flex items-center pt-2 space-x-2">
                <Switch
                  id="specific-time"
                  checked={!isAllDay}
                  onCheckedChange={(checked) => setIsAllDay(!checked)}
                />
                <Label htmlFor="specific-time">Block specific time</Label>
              </div>

              {/* Time Inputs */}
              {!isAllDay && (
                <div className="grid grid-cols-2 gap-4 p-3 border rounded-md bg-slate-50">
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
            </div>
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
                <div className="flex w-full gap-2 sm:w-auto">
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
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
