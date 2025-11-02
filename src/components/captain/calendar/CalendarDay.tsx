/**
 * Calendar Day Component
 *
 * Individual day cell in the calendar grid.
 * Shows date, availability status, and booking indicators.
 */

"use client";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Booking {
  id: string;
  tripName?: string;
  status: string;
  anglerName?: string;
  anglerEmail?: string;
}

interface CalendarDayProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  available: boolean;
  reason?: string;
  bookings: Booking[];
  onClick?: (date: Date, hasBookings: boolean) => void;
}

export function CalendarDay({
  date,
  isCurrentMonth,
  isToday,
  available,
  reason,
  bookings,
  onClick,
}: CalendarDayProps) {
  // Determine status type
  const getStatus = () => {
    if (!isCurrentMonth) return "out-of-month";

    // Check if there are any bookings
    // Match BookingCalendar logic: PAID and COMPLETED are confirmed bookings
    const hasConfirmedBookings = bookings.some(
      (b) => b.status === "PAID" || b.status === "COMPLETED"
    );
    const hasPendingBookings = bookings.some((b) => b.status === "PENDING");

    if (hasConfirmedBookings) return "booked";
    if (hasPendingBookings) return "pending";

    // Check availability
    if (!available) {
      // Check if it's a schedule-based closure or manual block
      // Non-operational reasons contain "operate" or "Not operational"
      if (
        reason?.toLowerCase().includes("operate") ||
        reason?.toLowerCase().includes("not operational")
      ) {
        return "non-operational";
      }
      return "blocked";
    }

    return "operational";
  };

  const status = getStatus();

  // Get background color based on status - matching legend colors
  const getBackgroundColor = () => {
    switch (status) {
      case "out-of-month":
        return "bg-slate-50";
      case "booked":
        return "bg-green-500/20"; // Green with opacity for better readability
      case "pending":
        return "bg-yellow-500/20"; // Yellow with opacity
      case "blocked":
        return "bg-red-500/20"; // Red with opacity
      case "non-operational":
        return "bg-slate-300/40"; // Grey with opacity
      case "operational":
      default:
        return "bg-blue-500/10"; // Blue with opacity
    }
  };

  const getBorderColor = () => {
    if (isToday) return "border-2 border-blue-500";
    return "border border-slate-200";
  };

  const handleClick = () => {
    if (!isCurrentMonth) return;
    onClick?.(date, bookings.length > 0);
  };

  // Check if date is in the past
  const isPast = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  })();

  const isPastWithoutBookings = isPast && bookings.length === 0;

  return (
    <div
      className={cn(
        "relative flex min-h-[80px] flex-col rounded-lg p-2 transition-colors",
        getBackgroundColor(),
        getBorderColor(),
        !isCurrentMonth && "opacity-40",
        isPastWithoutBookings && "opacity-50 cursor-not-allowed",
        isCurrentMonth &&
          onClick &&
          !isPastWithoutBookings &&
          "cursor-pointer hover:shadow-md"
      )}
      title={reason || undefined}
      onClick={handleClick}
    >
      {/* Date Number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium",
            isToday ? "text-blue-600" : "text-slate-700",
            !isCurrentMonth && "text-slate-400"
          )}
        >
          {format(date, "d")}
        </span>
        {isToday && <span className="h-2 w-2 rounded-full bg-blue-500" />}
      </div>

      {/* Booking Indicators */}
      {bookings.length > 0 && (
        <div className="mt-auto space-y-1">
          {bookings.slice(0, 3).map((booking) => (
            <div
              key={booking.id}
              className={cn(
                "truncate rounded-sm px-1 py-0.5 text-xs",
                booking.status === "PAID" || booking.status === "COMPLETED"
                  ? "bg-green-100 text-green-700"
                  : booking.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-700"
              )}
            >
              {booking.tripName || booking.anglerName || "Booking"}
            </div>
          ))}
          {bookings.length > 3 && (
            <div className="text-xs font-medium text-slate-600">
              +{bookings.length - 3} more
            </div>
          )}
        </div>
      )}

      {/* Status Indicator for unavailable days */}
      {!available && reason && bookings.length === 0 && (
        <div className="mt-auto">
          <span className="text-xs font-medium text-slate-600">
            {status === "non-operational" ? "Closed" : "Blocked"}
          </span>
        </div>
      )}
    </div>
  );
}
