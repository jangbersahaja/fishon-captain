import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { TimeGrid } from "../TimeGrid";

interface DayViewProps {
  date: Date;
  bookings: EnrichedMarketBooking[];
  onEventClick: (booking: EnrichedMarketBooking) => void;
  onSlotClick?: (date: Date) => void;
  scheduleType?: string;
  operationalDays?: number[];
}

export function DayView({
  date,
  bookings,
  onEventClick,
  onSlotClick,
  scheduleType,
  operationalDays,
}: DayViewProps) {
  return (
    <TimeGrid
      date={date}
      days={1}
      bookings={bookings}
      onEventClick={onEventClick}
      onSlotClick={onSlotClick}
      scheduleType={scheduleType}
      operationalDays={operationalDays}
    />
  );
}
