"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { GoogleCalendarSection } from "./GoogleCalendarSection";
import { OperationalScheduleEditor } from "./OperationalScheduleEditor";

interface CalendarSidebarProps {
  charters: {
    id: string;
    name: string;
    schedule?: {
      scheduleType?: string;
      operationalDays?: number[];
    } | null;
  }[];
  selectedCharterId?: string;
  onCharterChange: (charterId: string) => void;
  date: Date;
  onDateChange: (date: Date) => void;
  showCancelled: boolean;
  onShowCancelledChange: (value: boolean) => void;
  className?: string;
  /** Hide mini calendar (e.g., on mobile) */
  hideMiniCalendar?: boolean;
}

export function CalendarSidebar({
  charters,
  selectedCharterId,
  onCharterChange,
  date,
  onDateChange,
  showCancelled,
  onShowCancelledChange,
  className,
  hideMiniCalendar = false,
}: CalendarSidebarProps) {
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);

  // Find selected charter's schedule
  const selectedCharter = charters.find((c) => c.id === selectedCharterId);
  const currentSchedule = selectedCharter?.schedule;
  const currentScheduleType = currentSchedule?.scheduleType || "EVERYDAY";
  const currentOperationalDays = currentSchedule?.operationalDays || [];

  // Format schedule type for display
  const formatScheduleType = (type: string): string => {
    switch (type) {
      case "EVERYDAY":
        return "Everyday";
      case "WEEKDAYS":
        return "Weekdays";
      case "WEEKENDS":
        return "Weekends";
      case "CUSTOM":
        return "Custom";
      default:
        return type;
    }
  };

  // Format custom days for display
  const formatCustomDays = (days: number[]): string => {
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    if (days.length === 0) return "No days selected";
    if (days.length === 7) return "Every day";
    const sorted = [...days].sort();
    return sorted.map((d) => dayNames[d]).join(", ");
  };

  // Get badge color based on schedule type
  const getBadgeVariant = (
    type: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case "EVERYDAY":
        return "default";
      case "WEEKDAYS":
        return "secondary";
      case "WEEKENDS":
        return "outline";
      case "CUSTOM":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-4 border-r bg-white h-full",
        className
      )}
    >
      {/* Charter Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">
          Select Charter
        </label>
        <Select
          value={selectedCharterId}
          onValueChange={onCharterChange}
          disabled={charters.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a charter" />
          </SelectTrigger>
          <SelectContent>
            {charters.map((charter) => (
              <SelectItem key={charter.id} value={charter.id}>
                {charter.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mini Calendar - Hidden on mobile */}
      {!hideMiniCalendar && (
        <div className="border rounded-md p-2 flex justify-center">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onDateChange(d)}
            className="rounded-md border-0"
          />
        </div>
      )}

      {/* Operational Schedule Section */}
      {selectedCharterId && (
        <div className="space-y-3 pb-4 border-b">
          <h3 className="text-sm font-medium text-muted-foreground">
            Operational Schedule
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={getBadgeVariant(currentScheduleType)}>
                {formatScheduleType(currentScheduleType)}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setEditScheduleOpen(true)}
                title="Edit operational schedule"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
            {currentScheduleType === "CUSTOM" && (
              <p className="text-xs text-slate-600">
                {formatCustomDays(currentOperationalDays)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Filters</h3>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-cancelled"
            checked={showCancelled}
            onCheckedChange={onShowCancelledChange}
          />
          <Label htmlFor="show-cancelled">Show Cancelled & Rejected</Label>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="pt-4 border-t">
        <GoogleCalendarSection />
      </div>

      {/* Operational Schedule Editor Modal */}
      {selectedCharterId && selectedCharter && (
        <OperationalScheduleEditor
          charterId={selectedCharterId}
          charterName={selectedCharter.name}
          currentScheduleType={currentScheduleType}
          currentOperationalDays={currentOperationalDays}
          onSuccess={() => {
            // Modal closes automatically via onOpenChange
            // Data will be revalidated via router refresh in editor
          }}
          open={editScheduleOpen}
          onOpenChange={setEditScheduleOpen}
        />
      )}
    </div>
  );
}
