"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { EnhancedBookingCard } from "../EnhancedBookingCard";

interface EventDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  booking: EnrichedMarketBooking | null;
  anglerInfo?: {
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export function EventDetailsPanel({
  isOpen,
  onClose,
  booking,
  anglerInfo,
}: EventDetailsPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Even if not open, we render nothing if no booking to avoid errors
  // But Sheet needs to be rendered to handle closing animation properly usually,
  // however if booking is null we can't render the card.
  // So we rely on the parent to only open if booking is set, or we handle null gracefully.

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={
          isDesktop
            ? "w-[400px] sm:w-[540px] overflow-y-auto"
            : "h-[85vh] w-full overflow-y-auto rounded-t-xl"
        }
      >
        <SheetHeader className="mb-6">
          <SheetTitle>Booking Details</SheetTitle>
          <SheetDescription>
            View and manage booking information.
          </SheetDescription>
        </SheetHeader>

        {booking && (
          <div className="space-y-6">
            <EnhancedBookingCard
              booking={booking}
              anglerInfo={anglerInfo}
              showTimeline={true}
              viewDensity="comfortable"
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
