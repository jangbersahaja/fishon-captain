"use client";

import { updateCharterSchedule } from "@/app/actions/schedule-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface OperationalScheduleEditorProps {
  charterId: string;
  charterName: string;
  currentScheduleType?: string; // EVERYDAY, WEEKDAYS, WEEKENDS, or CUSTOM
  currentOperationalDays?: number[]; // 0-6, only used if CUSTOM
  onSuccess?: () => void; // Callback after successful save
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHEDULE_TYPES = [
  { value: "EVERYDAY", label: "Everyday" },
  { value: "WEEKDAYS", label: "Weekdays Only" },
  { value: "WEEKENDS", label: "Weekends Only" },
  { value: "CUSTOM", label: "Custom Days" },
];

export function OperationalScheduleEditor({
  charterId,
  charterName,
  currentScheduleType = "EVERYDAY",
  currentOperationalDays = [],
  onSuccess,
  open = false,
  onOpenChange,
}: OperationalScheduleEditorProps) {
  const [isPending, startTransition] = useTransition();

  // Form state
  const [scheduleType, setScheduleType] = useState<string>(currentScheduleType);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    currentOperationalDays
  );
  const [isOpen, setIsOpen] = useState(open);

  // Sync open state with prop changes
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setScheduleType(currentScheduleType);
      setSelectedDays(currentOperationalDays);
    }
  }, [isOpen, currentScheduleType, currentOperationalDays]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleScheduleTypeChange = (value: string) => {
    setScheduleType(value);

    // When switching to CUSTOM, preserve selected days or use defaults
    if (value === "CUSTOM" && selectedDays.length === 0) {
      // Default to all days if switching to CUSTOM with no selection
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
    // When switching away from CUSTOM, clear day selections
    if (value !== "CUSTOM") {
      setSelectedDays([]);
    }
  };

  const handleDayToggle = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const isValidSelection = scheduleType !== "CUSTOM" || selectedDays.length > 0;

  const handleSave = () => {
    // Validate
    if (!isValidSelection) {
      toast.error("Please select at least one day for Custom schedule");
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateCharterSchedule(
          charterId,
          scheduleType,
          scheduleType === "CUSTOM" ? selectedDays : undefined
        );

        if (result.success) {
          toast.success("Schedule updated successfully");
          onSuccess?.();
          handleOpenChange(false);
        } else {
          toast.error(result.error || "Failed to update schedule");
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "An unexpected error occurred"
        );
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Operational Schedule</DialogTitle>
          <DialogDescription>{charterName}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Schedule Type Selector */}
          <div className="space-y-2">
            <Label htmlFor="schedule-type">Schedule Type</Label>
            <Select
              value={scheduleType}
              onValueChange={handleScheduleTypeChange}
            >
              <SelectTrigger id="schedule-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Day Selector Grid (only show if CUSTOM selected) */}
          {scheduleType === "CUSTOM" && (
            <div className="space-y-3">
              <Label>Operating Days</Label>
              <div className="grid grid-cols-7 gap-3">
                {DAYS.map((day, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-2"
                  >
                    <input
                      type="checkbox"
                      id={`day-${index}`}
                      checked={selectedDays.includes(index)}
                      onChange={() => handleDayToggle(index)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500"
                      aria-label={`${day}`}
                    />
                    <label
                      htmlFor={`day-${index}`}
                      className="text-xs font-medium text-gray-600 cursor-pointer select-none"
                    >
                      {day}
                    </label>
                  </div>
                ))}
              </div>

              {/* Validation Message */}
              {!isValidSelection && (
                <div className="p-2 text-sm text-red-600 rounded bg-red-50">
                  Please select at least one day
                </div>
              )}
            </div>
          )}

          {/* Info Message for Preset Types */}
          {scheduleType !== "CUSTOM" && (
            <div className="p-3 space-y-1 text-sm text-gray-600 rounded bg-gray-50">
              <p className="font-medium">Schedule Details:</p>
              <p>
                {scheduleType === "EVERYDAY" &&
                  "Charter will be available every day of the week."}
                {scheduleType === "WEEKDAYS" &&
                  "Charter will be available Monday through Friday."}
                {scheduleType === "WEEKENDS" &&
                  "Charter will be available Saturday and Sunday."}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !isValidSelection}
            className="gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
