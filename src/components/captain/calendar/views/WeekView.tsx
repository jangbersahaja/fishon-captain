import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { startOfWeek } from "date-fns";
import { TimeGrid } from "../TimeGrid";

interface WeekViewProps {
  date: Date;
  bookings: EnrichedMarketBooking[];
  onEventClick: (booking: EnrichedMarketBooking) => void;
  onSlotClick?: (date: Date) => void;
  scheduleType?: string;
  operationalDays?: number[];
}

export function WeekView({
  date,
  bookings,
  onEventClick,
  onSlotClick,
  scheduleType,
  operationalDays,
}: WeekViewProps) {
  const weekStart = startOfWeek(date);

  return (
    <TimeGrid
      date={weekStart}
      days={7}
      bookings={bookings}
      onEventClick={onEventClick}
      onSlotClick={onSlotClick}
      scheduleType={scheduleType}
      operationalDays={operationalDays}
    />
  );
}
