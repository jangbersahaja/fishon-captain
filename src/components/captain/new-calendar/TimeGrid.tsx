import { isOperationalDay } from "@/lib/calendar/schedule-helpers";
import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import {
  addDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isSameDay,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { CalendarEventBand } from "./CalendarEventBand";

interface TimeGridProps {
  date: Date;
  days: number;
  bookings: EnrichedMarketBooking[];
  onEventClick: (booking: EnrichedMarketBooking) => void;
  onSlotClick?: (date: Date) => void;
  scheduleType?: string;
  operationalDays?: number[];
}

export function TimeGrid({
  date: startDate,
  days,
  bookings,
  onEventClick,
  onSlotClick,
  scheduleType,
  operationalDays,
}: TimeGridProps) {
  const gridDays = Array.from({ length: days }, (_, i) =>
    addDays(startDate, i)
  );

  // Separate bookings into All Day and Time Grid
  const allDayBookings: EnrichedMarketBooking[] = [];
  const timeGridBookings: EnrichedMarketBooking[] = [];

  bookings.forEach((booking) => {
    const firstSlot = booking.timeSlots?.[0];
    if (!firstSlot) return;

    const start = new Date(firstSlot.startDateTime);
    const end = new Date(firstSlot.endDateTime);
    const durationHours = differenceInHours(end, start);

    // If duration is >= 24 hours, treat as all-day/multi-day
    // Otherwise, treat as time-grid event (even if it crosses midnight)
    if (durationHours >= 24) {
      allDayBookings.push(booking);
    } else {
      timeGridBookings.push(booking);
    }
  });

  // Helper to get bookings for a specific day
  const getBookingsForDay = (day: Date, list: EnrichedMarketBooking[]) => {
    return list.filter((booking) => {
      const firstSlot = booking.timeSlots?.[0];
      if (!firstSlot) return false;
      const start = new Date(firstSlot.startDateTime);
      const end = new Date(firstSlot.endDateTime);

      // Check if the booking overlaps with this day (00:00 - 23:59)
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1); // Use next day start as exclusive upper bound

      // Simple overlap check: Start < DayEnd AND End > DayStart
      return start < dayEnd && end > dayStart;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex border-b bg-slate-50">
        <div className="w-16 flex-shrink-0 border-r bg-slate-50" />
        <div
          className="flex-1 grid"
          style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}
        >
          {gridDays.map((day) => {
            const isOperational = isOperationalDay(
              day,
              scheduleType,
              operationalDays
            );

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "py-2 text-center border-r last:border-r-0",
                  !isOperational && scheduleType && "bg-gray-100"
                )}
              >
                <div className="text-xs font-semibold text-slate-500 uppercase">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "text-sm font-medium w-8 h-8 mx-auto flex items-center justify-center rounded-full mt-1",
                    isSameDay(day, new Date())
                      ? "bg-blue-600 text-white"
                      : "text-slate-900"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Day Section */}
      {allDayBookings.length > 0 && (
        <div className="flex border-b bg-white">
          <div className="w-16 flex-shrink-0 border-r p-2 text-xs text-slate-500 text-right">
            All Day
          </div>
          <div
            className="flex-1 grid"
            style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}
          >
            {gridDays.map((day) => {
              const dayBookings = getBookingsForDay(day, allDayBookings);
              const isOperational = isOperationalDay(
                day,
                scheduleType,
                operationalDays
              );

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border-r last:border-r-0 p-1 space-y-1",
                    !isOperational && scheduleType && "bg-gray-100"
                  )}
                >
                  {dayBookings.map((booking) => (
                    <CalendarEventBand
                      key={booking.id}
                      booking={booking}
                      onClick={onEventClick}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time Grid Scrollable Area */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex min-h-[600px]">
          {" "}
          {/* Ensure minimum height */}
          {/* Time Axis */}
          <div className="w-16 flex-shrink-0 border-r bg-slate-50 select-none">
            {Array.from({ length: 24 }).map((_, hour) => (
              <div
                key={hour}
                className="h-12 border-b text-xs text-slate-400 text-right pr-2 pt-1 relative"
              >
                <span className="-top-2.5 relative bg-slate-50 pl-1">
                  {format(setHours(new Date(), hour), "h a")}
                </span>
              </div>
            ))}
          </div>
          {/* Grid Columns */}
          <div
            className="flex-1 grid relative"
            style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}
          >
            {/* Horizontal Lines for hours */}
            <div className="absolute inset-0 flex flex-col pointer-events-none">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div key={hour} className="h-12 border-b border-slate-100" />
              ))}
            </div>

            {gridDays.map((day) => {
              const dayBookings = getBookingsForDay(day, timeGridBookings);
              const isOperational = isOperationalDay(
                day,
                scheduleType,
                operationalDays
              );

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-r last:border-r-0 h-[1152px]",
                    !isOperational && scheduleType && "bg-gray-100"
                  )} // 24 * 48px (h-12 is 3rem = 48px)
                  onClick={(e) => {
                    if (onSlotClick) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y =
                        e.clientY - rect.top + e.currentTarget.scrollTop; // Adjust for scroll if needed, but here click is on the div
                      // Actually, e.clientY is viewport relative.
                      // e.nativeEvent.offsetY is relative to target.
                      const offsetY = e.nativeEvent.offsetY;
                      const hour = Math.floor(offsetY / 48);
                      const minute = Math.floor(((offsetY % 48) / 48) * 60);
                      const clickedDate = setMinutes(
                        setHours(day, hour),
                        minute
                      );
                      onSlotClick(clickedDate);
                    }
                  }}
                >
                  {dayBookings.map((booking) => {
                    const firstSlot = booking.timeSlots?.[0];
                    if (!firstSlot) return null;

                    const start = new Date(firstSlot.startDateTime);
                    const end = new Date(firstSlot.endDateTime);

                    // Calculate effective start/end for this day column
                    const dayStart = startOfDay(day);
                    const dayEnd = addDays(dayStart, 1);

                    // If booking starts before today, effective start is 00:00 (dayStart)
                    const effectiveStart = start < dayStart ? dayStart : start;

                    // If booking ends after today, effective end is 24:00 (dayEnd)
                    const effectiveEnd = end > dayEnd ? dayEnd : end;

                    // Calculate position relative to dayStart
                    const startMinutes = differenceInMinutes(
                      effectiveStart,
                      dayStart
                    );
                    const durationMinutes = differenceInMinutes(
                      effectiveEnd,
                      effectiveStart
                    );

                    // 48px per hour = 0.8px per minute
                    const top = startMinutes * 0.8;
                    const height = Math.max(durationMinutes * 0.8, 24); // Min height 24px

                    return (
                      <div
                        key={booking.id}
                        className="absolute inset-x-1 rounded overflow-hidden text-xs border shadow-sm cursor-pointer hover:brightness-95 transition-all z-10"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: getStatusColor(booking.status),
                          borderColor: getStatusBorderColor(booking.status),
                          color: getStatusTextColor(booking.status),
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(booking);
                        }}
                      >
                        <div className="p-1 font-medium truncate">
                          {booking.tripName || "Booking"}
                        </div>
                        <div className="px-1 text-[10px] opacity-90 truncate">
                          {format(start, "h:mm a")} - {format(end, "h:mm a")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  if (status === "PAID" || status === "COMPLETED") return "#dcfce7"; // green-100
  if (status === "PENDING" || status === "AWAITING_PAYMENT") return "#fef9c3"; // yellow-100
  if (status === "UNDER_REVIEW") return "#dbeafe"; // blue-100
  if (status === "CANCELLED" || status === "REJECTED") return "#f1f5f9"; // slate-100
  return "#f1f5f9";
}

function getStatusBorderColor(status: string) {
  if (status === "PAID" || status === "COMPLETED") return "#86efac"; // green-300
  if (status === "PENDING" || status === "AWAITING_PAYMENT") return "#fde047"; // yellow-300
  if (status === "UNDER_REVIEW") return "#93c5fd"; // blue-300
  if (status === "CANCELLED" || status === "REJECTED") return "#cbd5e1"; // slate-300
  return "#cbd5e1";
}

function getStatusTextColor(status: string) {
  if (status === "PAID" || status === "COMPLETED") return "#166534"; // green-800
  if (status === "PENDING" || status === "AWAITING_PAYMENT") return "#854d0e"; // yellow-800
  if (status === "UNDER_REVIEW") return "#1e40af"; // blue-800
  if (status === "CANCELLED" || status === "REJECTED") return "#475569"; // slate-600
  return "#475569";
}
