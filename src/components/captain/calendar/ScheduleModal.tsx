/**
 * Schedule Modal Component
 *
 * Modal for editing charter operational schedule with affected bookings preview.
 */

"use client";

import { useToasts } from "@/components/toast/ToastContext";
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
import type { CharterSchedule, ScheduleType } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ScheduleModalProps {
  charterId: string;
  currentSchedule: CharterSchedule | null;
  isOpen: boolean;
  onClose: () => void;
}

const SCHEDULE_OPTIONS = [
  {
    value: "EVERYDAY" as ScheduleType,
    label: "Every Day",
    description: "Operate 7 days a week",
  },
  {
    value: "WEEKDAYS" as ScheduleType,
    label: "Weekdays Only",
    description: "Monday through Friday",
  },
  {
    value: "WEEKENDS" as ScheduleType,
    label: "Weekends Only",
    description: "Saturday and Sunday",
  },
  {
    value: "CUSTOM" as ScheduleType,
    label: "Custom Schedule",
    description: "Select specific days",
  },
];

const DAY_NAMES = [
  { value: 0, label: "Sunday", short: "Sun" },
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
];

export function ScheduleModal({
  charterId,
  currentSchedule,
  isOpen,
  onClose,
}: ScheduleModalProps) {
  const router = useRouter();
  const toasts = useToasts();
  const [isLoading, setIsLoading] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    currentSchedule?.scheduleType || "EVERYDAY"
  );
  const [operationalDays, setOperationalDays] = useState<number[]>(
    currentSchedule?.operationalDays || []
  );

  const toggleDay = (day: number) => {
    setOperationalDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSubmit = async () => {
    // Validate CUSTOM schedule
    if (scheduleType === "CUSTOM" && operationalDays.length === 0) {
      toasts.push({
        type: "error",
        message:
          "Please select at least one operational day for custom schedule.",
        autoDismiss: 5000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/charters/${charterId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleType,
          operationalDays: scheduleType === "CUSTOM" ? operationalDays : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update schedule");
      }

      const data = await response.json();

      toasts.push({
        type: "success",
        message: data.message || "Your operational schedule has been updated.",
        autoDismiss: 4000,
      });

      // Refresh page to show updated schedule
      router.refresh();
      onClose();
    } catch (error) {
      console.error("Error updating schedule:", error);
      toasts.push({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update schedule",
        autoDismiss: 6000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Operational Schedule</DialogTitle>
          <DialogDescription>
            Choose which days your charter operates. This will affect
            availability for new bookings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Schedule Type Selection */}
          <div className="space-y-3">
            <Label>Schedule Type</Label>
            <RadioGroup
              value={scheduleType}
              onValueChange={(v) => setScheduleType(v as ScheduleType)}
            >
              {SCHEDULE_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-start space-x-3">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={option.value}
                      className="cursor-pointer font-medium"
                    >
                      {option.label}
                    </Label>
                    <p className="text-xs text-slate-500">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Custom Days Selection */}
          {scheduleType === "CUSTOM" && (
            <div className="space-y-3">
              <Label>Select Operational Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {DAY_NAMES.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`rounded-md border-2 px-4 py-2 text-sm font-medium transition-colors ${
                      operationalDays.includes(day.value)
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              {operationalDays.length === 0 && (
                <p className="text-xs text-red-600">
                  Please select at least one operational day.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
