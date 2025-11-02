/**
 * Charter Calendar Component
 *
 * Full month calendar view with bookings, schedule, and unavailability.
 * Shows all booking statuses with color coding.
 */

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { cn } from "@/lib/utils";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { EnhancedBookingCard } from "../EnhancedBookingCard";
import { CalendarDay } from "./CalendarDay";
import { UnavailabilityModal } from "./UnavailabilityModal";

interface CharterCalendarProps {
  charterId: string;
  charterName: string;
  bookings: EnrichedMarketBooking[];
  anglerMap: Record<
    string,
    { id: string; name: string | null; email: string; image: string | null }
  >;
  unavailability?: Array<{
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    reason: string | null;
  }>;
}

interface CalendarData {
  availability?: {
    dateAvailability?: Array<{
      date: string;
      available: boolean;
      reason?: string;
    }>;
  };
}

export function CharterCalendar({
  charterId,
  bookings,
  anglerMap,
  unavailability = [],
}: CharterCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<{
    date: Date;
    bookings: EnrichedMarketBooking[];
  } | null>(null);
  const [selectedBlockedDate, setSelectedBlockedDate] = useState<{
    date: Date;
    block: {
      id: string;
      startDate: Date | string;
      endDate: Date | string;
      reason: string | null;
    };
  } | null>(null);

  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Helper function to format date as YYYY-MM-DD (local timezone)
  const formatDateYMD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Fetch calendar data for current month
  useEffect(() => {
    const fetchCalendarData = async () => {
      setIsLoading(true);
      try {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Fetch availability data (use local date format, not ISO)
        const availabilityRes = await fetch(
          `/api/public/charters/${charterId}/availability?` +
            `startDate=${formatDateYMD(monthStart)}&` +
            `endDate=${formatDateYMD(monthEnd)}`
        );

        if (!availabilityRes.ok) {
          throw new Error("Failed to fetch availability");
        }

        const availabilityData = await availabilityRes.json();

        setCalendarData({
          availability: availabilityData,
        });
      } catch (error) {
        console.error("Error fetching calendar data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalendarData();
  }, [charterId, currentMonth]);

  // Scroll to today on mobile when calendar data loads or month changes
  useEffect(() => {
    if (!isLoading && calendarData) {
      setTimeout(() => {
        const todayElement = mobileScrollRef.current?.querySelector(
          '[data-is-today="true"]'
        );
        if (todayElement) {
          todayElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }, [isLoading, calendarData, currentMonth]);

  // Refresh calendar data
  const refreshCalendar = () => {
    const fetchData = async () => {
      try {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        const availabilityRes = await fetch(
          `/api/public/charters/${charterId}/availability?` +
            `startDate=${formatDateYMD(monthStart)}&` +
            `endDate=${formatDateYMD(monthEnd)}`
        );

        if (availabilityRes.ok) {
          const availabilityData = await availabilityRes.json();
          setCalendarData({
            availability: availabilityData,
          });
        }
      } catch (error) {
        console.error("Error refreshing calendar:", error);
      }
    };

    fetchData();
  };

  // Handle date click
  const handleDateClick = (date: Date, hasBookings: boolean) => {
    // Don't allow actions on past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(date);
    clickedDate.setHours(0, 0, 0, 0);

    if (clickedDate < today && !hasBookings) {
      // Past dates without bookings are not clickable
      return;
    }

    if (hasBookings) {
      // Get bookings for this date
      const dateBookings = bookings.filter((booking) =>
        isSameDay(new Date(booking.date), date)
      );
      setSelectedDate({ date, bookings: dateBookings });
    } else {
      // Get availability info for this date
      const dayAvailability =
        calendarData?.availability?.dateAvailability?.find((item) =>
          isSameDay(new Date(item.date), date)
        );

      const isAvailable = dayAvailability?.available ?? true;

      if (!isAvailable) {
        // Date is blocked/unavailable
        // Check if it's a manually blocked date (exists in unavailability list)
        const manualBlock = unavailability.find((block) => {
          const blockStart = new Date(block.startDate);
          const blockEnd = new Date(block.endDate);
          blockStart.setHours(0, 0, 0, 0);
          blockEnd.setHours(0, 0, 0, 0);
          return clickedDate >= blockStart && clickedDate <= blockEnd;
        });

        if (manualBlock) {
          // Manual block found - open in edit mode
          setSelectedBlockedDate({
            date,
            block: manualBlock,
          });
        } else {
          // Schedule-based unavailability (non-operational day) - allow creating manual block
          setSelectedDate({ date, bookings: [] });
        }
      } else {
        // Available date - show modal to create new block
        setSelectedDate({ date, bookings: [] });
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedBlockedDate(null);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());

    // Scroll to today on mobile view
    setTimeout(() => {
      const todayElement = mobileScrollRef.current?.querySelector(
        '[data-is-today="true"]'
      );
      if (todayElement) {
        todayElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              <span className="text-base sm:text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToday}
                className="text-xs sm:text-sm"
              >
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 sm:h-10 sm:w-10"
                  onClick={handlePreviousMonth}
                >
                  <ChevronLeft className="w-3 h-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 sm:h-10 sm:w-10"
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="w-3 h-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-sm text-slate-500">Loading calendar...</p>
            </div>
          ) : (
            <>
              {/* Desktop View - Grid Calendar */}
              <div className="hidden space-y-2 md:block">
                {/* Week Day Headers */}
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="p-2 text-xs font-medium text-center text-slate-600"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isToday = isSameDay(day, new Date());

                    // Find availability for this day
                    const dayAvailability =
                      calendarData?.availability?.dateAvailability?.find(
                        (item) => isSameDay(new Date(item.date), day)
                      );

                    // Find bookings for this day
                    const dayBookings = bookings
                      .filter((booking) =>
                        isSameDay(new Date(booking.date), day)
                      )
                      .map((booking) => ({
                        id: booking.id,
                        tripName: booking.tripName,
                        status: booking.status,
                        anglerName: booking.guestFirstName
                          ? `${booking.guestFirstName} ${booking.guestLastName || ""}`
                          : undefined,
                        anglerEmail: booking.guestEmail || undefined,
                      }));

                    return (
                      <CalendarDay
                        key={day.toISOString()}
                        date={day}
                        isCurrentMonth={isCurrentMonth}
                        isToday={isToday}
                        available={dayAvailability?.available ?? true}
                        reason={dayAvailability?.reason}
                        bookings={dayBookings}
                        onClick={handleDateClick}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Mobile View - Vertical Scrollable List */}
              <div className="md:hidden">
                {/* Scrollable Date List */}
                <div
                  ref={mobileScrollRef}
                  className="space-y-2 max-h-[60vh] overflow-y-auto"
                >
                  {calendarDays
                    .filter((day) => isSameMonth(day, currentMonth))
                    .map((day) => {
                      const isToday = isSameDay(day, new Date());

                      // Find availability for this day
                      const dayAvailability =
                        calendarData?.availability?.dateAvailability?.find(
                          (item) => isSameDay(new Date(item.date), day)
                        );

                      // Find bookings for this day
                      const dayBookings = bookings
                        .filter((booking) =>
                          isSameDay(new Date(booking.date), day)
                        )
                        .map((booking) => ({
                          id: booking.id,
                          tripName: booking.tripName,
                          status: booking.status,
                          anglerName: booking.guestFirstName
                            ? `${booking.guestFirstName} ${booking.guestLastName || ""}`
                            : undefined,
                          anglerEmail: booking.guestEmail || undefined,
                        }));

                      const available = dayAvailability?.available ?? true;
                      const hasBookings = dayBookings.length > 0;
                      const hasPaidBookings = dayBookings.some(
                        (b) => b.status === "PAID" || b.status === "COMPLETED"
                      );
                      const hasPendingBookings = dayBookings.some(
                        (b) => b.status === "PENDING"
                      );

                      // Check if date is in the past
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const checkDate = new Date(day);
                      checkDate.setHours(0, 0, 0, 0);
                      const isPast = checkDate < today;
                      const isPastWithoutBookings = isPast && !hasBookings;

                      const getBgColor = () => {
                        if (hasPaidBookings) return "bg-green-500/10";
                        if (hasPendingBookings) return "bg-yellow-500/10";
                        if (!available) return "bg-red-500/10";
                        return "bg-blue-500/5";
                      };

                      const getStatusColor = () => {
                        if (hasPaidBookings) return "text-green-700";
                        if (hasPendingBookings) return "text-yellow-700";
                        if (!available) return "text-red-700";
                        return "text-slate-600";
                      };

                      return (
                        <button
                          key={day.toISOString()}
                          data-is-today={isToday}
                          onClick={() => handleDateClick(day, hasBookings)}
                          disabled={isPastWithoutBookings}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 transition-all text-left",
                            getBgColor(),
                            isToday
                              ? "border-blue-500 shadow-md"
                              : "border-slate-200",
                            isPastWithoutBookings
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:shadow-md active:scale-[0.98]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex flex-col items-center justify-center w-12 h-12 rounded-lg",
                                  isToday
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-100"
                                )}
                              >
                                <span className="text-xs font-medium">
                                  {format(day, "EEE")}
                                </span>
                                <span className="text-lg font-bold">
                                  {format(day, "d")}
                                </span>
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    getStatusColor()
                                  )}
                                >
                                  {hasBookings
                                    ? `${dayBookings.length} booking${dayBookings.length !== 1 ? "s" : ""}`
                                    : !available
                                      ? dayAvailability?.reason?.includes(
                                          "operate"
                                        ) ||
                                        dayAvailability?.reason?.includes(
                                          "Not operational"
                                        )
                                        ? "Closed"
                                        : "Blocked"
                                      : "Available"}
                                </p>
                                {hasBookings && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {dayBookings
                                      .slice(0, 2)
                                      .map((b) => b.tripName)
                                      .join(", ")}
                                    {dayBookings.length > 2 &&
                                      ` +${dayBookings.length - 2}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unavailability Modal - Opens when empty date is clicked */}
      {selectedDate && selectedDate.bookings.length === 0 && (
        <UnavailabilityModal
          charterId={charterId}
          isOpen={true}
          onClose={handleCloseModal}
          prefillDate={selectedDate.date}
          onSuccess={refreshCalendar}
        />
      )}

      {/* Unavailability Edit Modal - Opens when blocked date is clicked */}
      {selectedBlockedDate && (
        <UnavailabilityModal
          charterId={charterId}
          isOpen={true}
          onClose={handleCloseModal}
          onSuccess={refreshCalendar}
          editBlock={{
            id: selectedBlockedDate.block.id,
            charterId: charterId,
            startDate: new Date(selectedBlockedDate.block.startDate),
            endDate: new Date(selectedBlockedDate.block.endDate),
            reason: selectedBlockedDate.block.reason,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: charterId, // Use charterId as placeholder
          }}
        />
      )}

      {/* Booking Modal - Shows bookings for selected date */}
      {selectedDate && selectedDate.bookings.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {format(selectedDate.date, "EEEE, MMMM d, yyyy")}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDate.bookings.length} booking
                  {selectedDate.bookings.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 transition-colors rounded-lg text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {selectedDate.bookings.map((booking) => (
                <EnhancedBookingCard
                  key={booking.id}
                  booking={booking}
                  anglerInfo={booking.userId ? anglerMap[booking.userId] : null}
                  showTimeline={false}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
