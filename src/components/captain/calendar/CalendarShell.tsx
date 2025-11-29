"use client";

import { Button } from "@/components/ui/button";
import { useCalendarState } from "@/hooks/useCalendarState";
import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import type { CharterUnavailability } from "@prisma/client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { BlockedDateDetailsPanel } from "./BlockedDateDetailsPanel";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarSidebar } from "./CalendarSidebar";
import { CreateBlockModal } from "./CreateBlockModal";
import { EventDetailsPanel } from "./EventDetailsPanel";
import { AgendaView } from "./views/AgendaView";
import { DayView } from "./views/DayView";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";

interface CalendarShellProps {
  charters: {
    id: string;
    name: string;
    schedule?: {
      scheduleType?: string;
      operationalDays?: number[];
    } | null;
    trips: {
      id: string;
      name: string;
      durationHours: number;
    }[];
  }[];
  bookings: EnrichedMarketBooking[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anglerMap: Record<string, any>; // Replace with proper type if available
}

export function CalendarShell({
  charters,
  bookings,
  anglerMap,
}: CalendarShellProps) {
  const {
    view,
    date,
    charterId,
    showCancelled,
    setView,
    setDate,
    setCharterId,
    setShowCancelled,
  } = useCalendarState();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Filter bookings
  const filteredBookings = bookings.filter((booking) => {
    if (showCancelled) return true;
    if (booking.tripId === "blocked") return true;
    return !["CANCELLED", "REJECTED", "EXPIRED"].includes(booking.status);
  });

  // Interaction State
  const [selectedBooking, setSelectedBooking] =
    useState<EnrichedMarketBooking | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | undefined>(
    undefined
  );
  const [editBlock, setEditBlock] = useState<CharterUnavailability | null>(
    null
  );
  // Blocked date details panel state
  const [selectedBlock, setSelectedBlock] =
    useState<CharterUnavailability | null>(null);
  const [selectedBlockTripName, setSelectedBlockTripName] = useState<
    string | undefined
  >(undefined);
  const [isBlockDetailsOpen, setIsBlockDetailsOpen] = useState(false);

  // If no charter is selected in URL, but we have charters, default to the first one
  // The hook handles reading from URL, but if it's missing, we might want to set it
  // However, the Page likely already handled the default logic for fetching.
  // We just need to make sure the UI reflects the effective charter ID.
  const effectiveCharterId = charterId || charters[0]?.id;
  const selectedCharter = charters.find((c) => c.id === effectiveCharterId);
  const scheduleType = selectedCharter?.schedule?.scheduleType;
  const operationalDays = selectedCharter?.schedule?.operationalDays;

  const handleEventClick = (booking: EnrichedMarketBooking) => {
    if (booking.tripId === "blocked") {
      // Show blocked date details panel instead of edit modal
      const blockData: CharterUnavailability = {
        id: booking.id,
        charterId: booking.charterId,
        startDate: booking.date,
        endDate: booking.expiresAt,
        reason: booking.note || null,
        isAllDay: true,
        startTime: null,
        endTime: null,
        tripId: booking.originalTripId || null,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        createdBy: "system",
      };
      setSelectedBlock(blockData);
      // Find trip name if specific trip is blocked
      if (booking.originalTripId) {
        const trip = selectedCharter?.trips.find(
          (t) => t.id === booking.originalTripId
        );
        setSelectedBlockTripName(trip?.name);
      } else {
        setSelectedBlockTripName(undefined);
      }
      setIsBlockDetailsOpen(true);
    } else {
      setSelectedBooking(booking);
      setIsDetailsOpen(true);
    }
  };

  const handleEditBlock = () => {
    if (selectedBlock) {
      setEditBlock(selectedBlock);
      setIsCreateModalOpen(true);
    }
  };

  const handleSlotClick = (date: Date) => {
    setCreateModalDate(date);
    setEditBlock(null);
    setIsCreateModalOpen(true);
  };

  const handleNewBooking = () => {
    setCreateModalDate(new Date());
    setEditBlock(null);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="relative flex flex-col h-full md:h-screen">
      <CalendarHeader
        view={view}
        date={date}
        onViewChange={setView}
        onDateChange={setDate}
        onToday={() => setDate(new Date())}
        onNewBooking={handleNewBooking}
      />

      {/* Mobile Filters Toggle */}
      <div className="px-4 py-2 bg-white border-b md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="justify-between w-full"
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
        >
          <span>Filters & Settings</span>
          {isFiltersOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Mobile Collapsible Filters */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out bg-white border-b",
          isFiltersOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4">
          <CalendarSidebar
            charters={charters}
            selectedCharterId={effectiveCharterId}
            onCharterChange={setCharterId}
            date={date}
            onDateChange={(d) => {
              setDate(d);
              setIsFiltersOpen(false); // Close on selection
            }}
            showCancelled={showCancelled}
            onShowCancelledChange={setShowCancelled}
            className="h-auto p-0 border-none"
          />
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="flex-shrink-0 hidden overflow-y-auto bg-white border-r md:block w-80">
          <CalendarSidebar
            charters={charters}
            selectedCharterId={effectiveCharterId}
            onCharterChange={setCharterId}
            date={date}
            onDateChange={setDate}
            showCancelled={showCancelled}
            onShowCancelledChange={setShowCancelled}
            className="border-none"
          />
        </div>

        {/* Main Content Area */}
        <div className="relative flex-1 p-4 overflow-auto bg-slate-50">
          {view === "month" && (
            <div className="h-full">
              <MonthView
                date={date}
                bookings={filteredBookings}
                onDateClick={handleSlotClick}
                onEventClick={handleEventClick}
                scheduleType={scheduleType}
                operationalDays={operationalDays}
              />
            </div>
          )}

          {view === "week" && (
            <div className="h-full">
              <WeekView
                date={date}
                bookings={filteredBookings}
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
                scheduleType={scheduleType}
                operationalDays={operationalDays}
              />
            </div>
          )}

          {view === "day" && (
            <div className="h-full">
              <DayView
                date={date}
                bookings={filteredBookings}
                onEventClick={handleEventClick}
                onSlotClick={handleSlotClick}
                scheduleType={scheduleType}
                operationalDays={operationalDays}
              />
            </div>
          )}

          {view === "agenda" && (
            <div className="h-full">
              <AgendaView
                date={date}
                bookings={filteredBookings}
                onEventClick={handleEventClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <EventDetailsPanel
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        booking={selectedBooking}
        anglerInfo={
          selectedBooking ? anglerMap[selectedBooking.userId || ""] : null
        }
      />

      {/* Blocked Date Details Panel */}
      <BlockedDateDetailsPanel
        isOpen={isBlockDetailsOpen}
        onClose={() => {
          setIsBlockDetailsOpen(false);
          setSelectedBlock(null);
        }}
        block={selectedBlock}
        charterName={selectedCharter?.name}
        tripName={selectedBlockTripName}
        onEdit={handleEditBlock}
      />

      {/* Create Block Modal */}
      {effectiveCharterId && (
        <CreateBlockModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditBlock(null);
          }}
          prefillDate={createModalDate}
          charterId={effectiveCharterId}
          editBlock={editBlock}
          trips={selectedCharter?.trips || []}
          onSuccess={() => {
            // Refresh logic is handled inside UnavailabilityModal via router.refresh()
            // But we might want to close the modal here if not handled
            setIsCreateModalOpen(false);
            setEditBlock(null);
          }}
        />
      )}
    </div>
  );
}
