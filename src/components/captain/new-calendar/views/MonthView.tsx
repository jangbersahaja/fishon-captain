"use client";

import {
  getWeekSpansForWeek,
  layoutWeekSpans,
} from "@/lib/calendar/event-layout";
import { isOperationalDay } from "@/lib/calendar/schedule-helpers";
import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarEventBand } from "../CalendarEventBand";

interface MonthViewProps {
  date: Date;
  bookings: EnrichedMarketBooking[];
  onDateClick: (date: Date) => void;
  onEventClick: (booking: EnrichedMarketBooking) => void;
  scheduleType?: string;
  operationalDays?: number[];
}

export function MonthView({
  date: currentMonth,
  bookings,
  onDateClick,
  onEventClick,
  scheduleType,
  operationalDays,
}: MonthViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header Row */}
      <div className="grid grid-cols-7 border-b bg-slate-50">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-xs font-semibold text-center text-slate-500 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex flex-col divide-y">
        {weeks.map((weekDaysInGrid, weekIndex) => {
          const weekSpans = getWeekSpansForWeek(weekDaysInGrid, bookings);
          const weekRows = layoutWeekSpans(weekSpans);

          return (
            <div key={weekIndex} className="relative min-h-[120px] group">
              {/* Background Grid (Day Cells) */}
              <div className="absolute inset-0 grid grid-cols-7 divide-x">
                {weekDaysInGrid.map((day) => {
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isToday = isSameDay(day, new Date());
                  const isOperational = isOperationalDay(
                    day,
                    scheduleType,
                    operationalDays
                  );

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "relative p-2 transition-colors hover:bg-slate-50 cursor-pointer",
                        !isCurrentMonth && "bg-slate-50/50",
                        !isOperational && scheduleType && "bg-gray-100"
                      )}
                      onClick={() => onDateClick(day)}
                    >
                      <div className="flex justify-center">
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isToday
                              ? "bg-blue-600 text-white"
                              : isCurrentMonth
                                ? "text-slate-700"
                                : "text-slate-400"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Events Layer */}
              <div className="relative pt-8 pb-2 px-1 flex flex-col gap-1 pointer-events-none">
                {weekRows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-7 gap-1 auto-rows-fr"
                  >
                    {row.map((span, spanIndex) => (
                      <div
                        key={`${span.booking.id}-${spanIndex}`}
                        className="pointer-events-auto"
                        style={{
                          gridColumnStart: span.startIndex + 1,
                          gridColumnEnd: span.startIndex + span.span + 1,
                        }}
                      >
                        <CalendarEventBand
                          booking={span.booking}
                          onClick={onEventClick}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
