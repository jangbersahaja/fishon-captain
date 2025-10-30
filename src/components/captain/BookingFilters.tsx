"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Filter, X } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";

interface BookingFiltersProps {
  trips: Array<{ id: string; name: string }>;
  selectedTripId: string | null;
  dateRange: DateRange | undefined;
  onTripChange: (tripId: string | null) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function BookingFilters({
  trips,
  selectedTripId,
  dateRange,
  onTripChange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
}: BookingFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`gap-2 ${hasActiveFilters ? "border-blue-500 bg-blue-50 text-blue-700" : ""}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
                {(selectedTripId ? 1 : 0) + (dateRange?.from ? 1 : 0)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px]" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-900">Filter Bookings</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearFilters();
                    setIsOpen(false);
                  }}
                  className="h-8 gap-1 text-xs"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </Button>
              )}
            </div>

            {/* Trip Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Trip Type
              </label>
              <select
                value={selectedTripId || ""}
                onChange={(e) => onTripChange(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Trips</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Date Range
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start w-full font-normal text-left"
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                          {format(dateRange.to, "MMM dd, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      <span className="text-slate-500">Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={onDateRangeChange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDateRangeChange(undefined)}
                  className="w-full text-xs"
                >
                  Clear date range
                </Button>
              )}
            </div>

            {/* Apply button */}
            <Button className="w-full" onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
