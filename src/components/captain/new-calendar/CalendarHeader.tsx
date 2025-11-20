"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarView } from "@/hooks/useCalendarState";
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

interface CalendarHeaderProps {
  view: CalendarView;
  date: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onNewBooking?: () => void;
}

export function CalendarHeader({
  view,
  date,
  onViewChange,
  onDateChange,
  onToday,
  onNewBooking,
}: CalendarHeaderProps) {
  const handlePrev = () => {
    switch (view) {
      case "month":
        onDateChange(subMonths(date, 1));
        break;
      case "week":
        onDateChange(subWeeks(date, 1));
        break;
      case "day":
      case "agenda":
        onDateChange(subDays(date, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case "month":
        onDateChange(addMonths(date, 1));
        break;
      case "week":
        onDateChange(addWeeks(date, 1));
        break;
      case "day":
      case "agenda":
        onDateChange(addDays(date, 1));
        break;
    }
  };

  const formatDateLabel = () => {
    switch (view) {
      case "month":
        return format(date, "MMMM yyyy");
      case "week":
        return `Week of ${format(date, "MMM d, yyyy")}`;
      case "day":
      case "agenda":
        return format(date, "EEEE, MMMM d, yyyy");
      default:
        return format(date, "MMMM yyyy");
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 border-b bg-white">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>
        <div className="flex items-center rounded-md border bg-background">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-l-md border-r"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-none rounded-r-md"
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-semibold min-w-[150px] ml-2">
          {formatDateLabel()}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={view}
          onValueChange={(v) => onViewChange(v as CalendarView)}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
            <SelectItem value="agenda">Agenda</SelectItem>
          </SelectContent>
        </Select>

        <Button size="sm" className="gap-1" onClick={onNewBooking}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Booking</span>
        </Button>
      </div>
    </div>
  );
}
