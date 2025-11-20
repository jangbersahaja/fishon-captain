import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { addDays, isAfter, isSameDay, startOfDay } from "date-fns";

export type WeekEventSpan = {
  booking: EnrichedMarketBooking;
  startIndex: number;
  span: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  booking: EnrichedMarketBooking;
};

export const getWeekSpansForWeek = (
  weekDays: Date[],
  bookings: EnrichedMarketBooking[]
): WeekEventSpan[] => {
  const spans: WeekEventSpan[] = [];

  bookings.forEach((booking) => {
    if (booking.timeSlots && Array.isArray(booking.timeSlots)) {
      booking.timeSlots.forEach((slot) => {
        const start = new Date(slot.startDateTime);
        const end = new Date(slot.endDateTime);

        const startDay = startOfDay(start);
        const endDay = startOfDay(end);
        const oneDayMs = 24 * 60 * 60 * 1000;
        const isNextDay = endDay.getTime() - startDay.getTime() === oneDayMs;

        // Overnight: start on day N, end on day N+1
        // We treat any trip that spans exactly 2 calendar days as an overnight/continuous trip
        // This ensures it renders as a single band in Month View
        const isOvernightSameTrip = isNextDay;

        if (isSameDay(startDay, endDay)) {
          // Same calendar day: single-day span
          const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, startDay));
          if (dayIndex !== -1) {
            spans.push({ booking, startIndex: dayIndex, span: 1 });
          }
        } else if (isOvernightSameTrip) {
          // Overnight across two days: one continuous span of length 2
          const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, startDay));
          if (dayIndex !== -1 && dayIndex < 6) {
            spans.push({ booking, startIndex: dayIndex, span: 2 });
          } else if (dayIndex !== -1 && dayIndex === 6) {
            // Starts on Saturday, spans to next week (Sunday)
            // In this week view, it just takes the last slot
            spans.push({ booking, startIndex: dayIndex, span: 1 });
          } else {
            // Check if it started the previous week and ends this week (on Sunday/index 0)
            const prevDayIndex = weekDays.findIndex((wd) =>
              isSameDay(wd, endDay)
            );
            if (prevDayIndex === 0) {
              spans.push({ booking, startIndex: 0, span: 1 });
            }
          }
        } else {
          // True multi-day trip: emit per-day spans (Day 1 / Day 2 / Day 3 ...)
          let cursor = startDay;
          while (!isAfter(cursor, endDay)) {
            const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, cursor));
            if (dayIndex !== -1) {
              spans.push({ booking, startIndex: dayIndex, span: 1 });
            }
            cursor = startOfDay(addDays(cursor, 1));
          }
        }
      });
    } else if (booking.date) {
      const day = startOfDay(new Date(booking.date));
      const dayIndex = weekDays.findIndex((wd) => isSameDay(wd, day));
      if (dayIndex !== -1) {
        spans.push({ booking, startIndex: dayIndex, span: 1 });
      }
    }
  });

  return spans;
};

export const layoutWeekSpans = (spans: WeekEventSpan[]): WeekEventSpan[][] => {
  const rows: WeekEventSpan[][] = [];

  const sorted = [...spans].sort((a, b) => {
    if (a.startIndex === b.startIndex) {
      return b.span - a.span;
    }
    return a.startIndex - b.startIndex;
  });

  sorted.forEach((span) => {
    let placed = false;
    for (const row of rows) {
      const conflict = row.some((existing) => {
        const aStart = existing.startIndex;
        const aEnd = existing.startIndex + existing.span - 1;
        const bStart = span.startIndex;
        const bEnd = span.startIndex + span.span - 1;
        return bStart <= aEnd && aStart <= bEnd;
      });
      if (!conflict) {
        row.push(span);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([span]);
    }
  });

  return rows;
};
