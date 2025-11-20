import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import React from "react";

interface CalendarEventBandProps {
  booking: EnrichedMarketBooking;
  onClick?: (booking: EnrichedMarketBooking) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function CalendarEventBand({
  booking,
  onClick,
  className,
  style,
}: CalendarEventBandProps) {
  const firstSlot =
    booking.timeSlots && Array.isArray(booking.timeSlots)
      ? booking.timeSlots[0]
      : null;

  let timeSummary: string | null = null;
  if (firstSlot) {
    const start = new Date(firstSlot.startDateTime).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );
    const end = new Date(firstSlot.endDateTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    timeSummary = `${start} - ${end}`;
  }

  const statusColor = (() => {
    if (booking.status === "PAID" || booking.status === "COMPLETED")
      return "bg-green-500/80 text-white hover:bg-green-600/90";
    if (
      booking.status === "PENDING" ||
      booking.status === "AWAITING_PAYMENT" ||
      booking.status === "PAYMENT_AUTHORIZED"
    )
      return "bg-yellow-500/80 text-slate-900 hover:bg-yellow-500/90";
    if (booking.status === "UNDER_REVIEW")
      return "bg-blue-500/80 text-white hover:bg-blue-600/90";
    if (
      booking.status === "CANCELLED" ||
      booking.status === "REJECTED" ||
      booking.status === "EXPIRED"
    )
      return "bg-slate-400/80 text-white hover:bg-slate-500/90";
    return "bg-slate-500/80 text-white hover:bg-slate-600/90";
  })();

  return (
    <button
      type="button"
      className={cn(
        "h-6 rounded text-[11px] px-2 flex items-center overflow-hidden whitespace-nowrap transition-colors w-full text-left",
        statusColor,
        className
      )}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(booking);
      }}
    >
      <span className="truncate font-medium">
        {booking.tripName || booking.primaryBooker?.name || "Booking"}
        {timeSummary ? ` • ${timeSummary}` : ""}
      </span>
    </button>
  );
}
