"use client";

import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getPresetDateRange } from "@/lib/utils/date-range-utils";
import { format } from "date-fns";
import { Calendar } from "lucide-react";
import { useState } from "react";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "mtd"
  | "custom";

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (start: Date, end: Date, preset?: DateRangePreset) => void;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangeFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>("30d");
  const [showCustom, setShowCustom] = useState(false);

  const presets: Array<{ value: DateRangePreset; label: string }> = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7d", label: "Last 7 Days" },
    { value: "30d", label: "Last 30 Days" },
    { value: "mtd", label: "Month to Date" },
    { value: "custom", label: "Custom Range" },
  ];

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);

    if (preset === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);

    const range = getPresetDateRange(preset);
    onDateRangeChange(range.from, range.to, preset);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.value}
            variant={selectedPreset === preset.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetChange(preset.value)}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* Custom date pickers */}
      {showCustom && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(startDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) onDateRangeChange(date, endDate, "custom");
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-sm text-slate-500">to</span>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-left font-normal"
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(endDate, "MMM dd, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  if (date) onDateRangeChange(startDate, date, "custom");
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Current range display */}
      <div className="text-xs text-slate-500">
        Showing: {format(startDate, "MMM dd, yyyy")} -{" "}
        {format(endDate, "MMM dd, yyyy")}
      </div>
    </div>
  );
}
