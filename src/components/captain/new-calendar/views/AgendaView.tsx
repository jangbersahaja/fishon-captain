import { Badge } from "@/components/ui/badge";
import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { Calendar, MapPin, User } from "lucide-react";
import { useMemo } from "react";

interface AgendaViewProps {
  date: Date;
  bookings: EnrichedMarketBooking[];
  onEventClick: (booking: EnrichedMarketBooking) => void;
}

export function AgendaView({ date, bookings, onEventClick }: AgendaViewProps) {
  const groupedBookings = useMemo(() => {
    const startDate = startOfDay(date);

    // Filter bookings starting from the selected date
    const upcomingBookings = bookings
      .filter((booking) => {
        const bookingDate = new Date(booking.date);
        return bookingDate >= startDate;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group by date
    const groups: Record<string, EnrichedMarketBooking[]> = {};
    upcomingBookings.forEach((booking) => {
      const dateKey = format(new Date(booking.date), "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(booking);
    });

    return groups;
  }, [date, bookings]);

  const sortedDates = Object.keys(groupedBookings).sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Calendar className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-lg font-medium">No upcoming bookings</p>
        <p className="text-sm">
          You don&apos;t have any bookings scheduled from{" "}
          {format(date, "MMMM d")} onwards.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {sortedDates.map((dateKey) => {
        const groupDate = new Date(dateKey);
        const groupBookings = groupedBookings[dateKey];

        let dateLabel = format(groupDate, "EEEE, MMMM d");
        if (isToday(groupDate))
          dateLabel = `Today, ${format(groupDate, "MMMM d")}`;
        else if (isTomorrow(groupDate))
          dateLabel = `Tomorrow, ${format(groupDate, "MMMM d")}`;

        return (
          <div key={dateKey} className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-slate-50 py-2 z-10">
              {dateLabel}
            </h3>
            <div className="space-y-3">
              {groupBookings.map((booking) => (
                <AgendaItem
                  key={booking.id}
                  booking={booking}
                  onClick={() => onEventClick(booking)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaItem({
  booking,
  onClick,
}: {
  booking: EnrichedMarketBooking;
  onClick: () => void;
}) {
  const startTime = new Date(booking.date);
  const isBlocked = booking.tripId === "blocked";

  // Status badge color logic
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
      case "payment_authorized":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "pending":
      case "awaiting_payment":
      case "under_review":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "cancelled":
      case "rejected":
      case "expired":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-100";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col sm:flex-row gap-4",
        isBlocked && "bg-slate-50 border-slate-200"
      )}
    >
      {/* Time Column */}
      <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:w-24 flex-shrink-0">
        <span className="text-lg font-semibold text-slate-900">
          {format(startTime, "h:mm a")}
        </span>
        <span className="text-xs text-muted-foreground">
          {booking.durationHour > 0 ? `${booking.durationHour}h` : "All Day"}
        </span>
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4
            className={cn(
              "font-medium truncate",
              isBlocked ? "text-slate-600 italic" : "text-slate-900"
            )}
          >
            {isBlocked ? booking.note || "Blocked Slot" : booking.tripName}
          </h4>
          {!isBlocked && (
            <Badge
              variant="secondary"
              className={cn(
                "capitalize flex-shrink-0",
                getStatusColor(booking.status)
              )}
            >
              {booking.status.toLowerCase()}
            </Badge>
          )}
        </div>

        {!isBlocked && (
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">
                {booking.primaryBooker?.name || "Guest"}
                {booking.adults + booking.children > 1 &&
                  ` + ${booking.adults + booking.children - 1} others`}
              </span>
            </div>
            {booking.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate">{booking.location}</span>
              </div>
            )}
          </div>
        )}

        {isBlocked && booking.note && (
          <p className="text-sm text-slate-500 line-clamp-2">{booking.note}</p>
        )}
      </div>
    </div>
  );
}
