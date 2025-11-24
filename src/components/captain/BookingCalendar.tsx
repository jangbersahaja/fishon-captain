"use client";

import { formatDate, getTodayMY, toDateStringMY } from "@/lib/datetime";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EnhancedBookingCard } from "./EnhancedBookingCard";

interface BookingCalendarProps {
  bookings: EnrichedMarketBooking[];
  anglerMap: Record<
    string,
    { id: string; name: string | null; email: string; image: string | null }
  >;
}

interface DateBooking {
  date: Date;
  dateString: string;
  bookings: EnrichedMarketBooking[];
  isMultiDay: boolean;
  daySpan: number;
}

// Generate colors for different trip types
const TRIP_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-500",
];

export function BookingCalendar({ bookings, anglerMap }: BookingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<DateBooking | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Filter only PAID and COMPLETED bookings
  const displayBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status === "PAID" || b.status === "COMPLETED"
    );
  }, [bookings]);

  // Generate trip color mapping
  const tripColorMap = useMemo(() => {
    const uniqueTrips = Array.from(
      new Set(displayBookings.map((b) => b.tripName))
    );
    return Object.fromEntries(
      uniqueTrips.map((trip, idx) => [
        trip,
        TRIP_COLORS[idx % TRIP_COLORS.length],
      ])
    );
  }, [displayBookings]);

  // Generate calendar dates for current month view
  const calendarDates = useMemo(() => {
    const dates: Date[] = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get last day of month
    const lastDay = new Date(year, month + 1, 0);

    // Generate all dates in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      dates.push(new Date(year, month, day));
    }

    return dates;
  }, [currentMonth]);

  // Map bookings to dates
  const dateBookingsMap = useMemo(() => {
    const map = new Map<string, DateBooking>();

    displayBookings.forEach((booking) => {
      const startDate = new Date(booking.date);
      const days = booking.days || 1;

      // Add booking to each day it spans
      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateString = toDateStringMY(currentDate);

        if (!map.has(dateString)) {
          map.set(dateString, {
            date: currentDate,
            dateString,
            bookings: [],
            isMultiDay: days > 1,
            daySpan: days,
          });
        }

        const dateBooking = map.get(dateString)!;
        dateBooking.bookings.push(booking);
      }
    });

    return map;
  }, [displayBookings]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = getTodayMY();

  // Scroll to today when month changes or on mount (within container only)
  useEffect(() => {
    if (scrollContainerRef.current) {
      const todayElement = scrollContainerRef.current.querySelector(
        '[data-is-today="true"]'
      );
      if (todayElement) {
        // Calculate scroll position relative to container, not the page
        const container = scrollContainerRef.current;
        const elementRect = (todayElement as HTMLElement).offsetLeft;
        const containerWidth = container.offsetWidth;
        const elementWidth = (todayElement as HTMLElement).offsetWidth;

        // Center the element in the container
        const scrollPosition =
          elementRect - containerWidth / 2 + elementWidth / 2;

        container.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    }
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const monthName = formatDate(currentMonth, {
    month: "long",
    year: "numeric",
    day: undefined,
  });

  return (
    <>
      <div className="p-4 bg-white border rounded-2xl border-slate-200 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Booking Calendar
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Today
            </button>
            <div className="flex items-center gap-1 px-2 py-1 text-sm font-medium border rounded-lg text-slate-700 bg-slate-50 border-slate-200">
              <button
                onClick={goToPreviousMonth}
                className="p-1 transition-colors rounded hover:bg-slate-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="min-w-[120px] text-center">{monthName}</span>
              <button
                onClick={goToNextMonth}
                className="p-1 transition-colors rounded hover:bg-slate-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Scroll Timeline */}
        <div
          ref={scrollContainerRef}
          className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide"
        >
          {calendarDates.map((date) => {
            const dateString = toDateStringMY(date);
            const dateBooking = dateBookingsMap.get(dateString);
            const hasBookings = dateBooking && dateBooking.bookings.length > 0;
            const isToday = dateString === today;

            return (
              <button
                key={dateString}
                data-is-today={isToday}
                onClick={() => hasBookings && setSelectedDate(dateBooking)}
                className={`flex-shrink-0 w-16 p-2 border-slate-200 rounded-lg border-2 transition-all relative ${
                  isToday ? " shadow-md" : ""
                } ${
                  hasBookings
                    ? "cursor-pointer hover:shadow-md hover:border-slate-300"
                    : "cursor-default"
                }`}
              >
                {isToday && (
                  <div className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -top-1 -right-1" />
                )}
                <div
                  className={`text-xs font-medium ${
                    isToday ? "text-blue-600 font-bold" : "text-slate-500"
                  }`}
                >
                  {formatDate(date, {
                    weekday: "short",
                    year: undefined,
                    month: undefined,
                    day: undefined,
                  })}
                </div>
                <div
                  className={`text-lg font-bold mt-1 ${
                    isToday ? "text-blue-600" : "text-slate-900"
                  }`}
                >
                  {formatDate(date, {
                    day: "numeric",
                    year: undefined,
                    month: undefined,
                  })}
                </div>
                <div
                  className={`mt-1 text-xs ${
                    isToday ? "text-blue-600 font-medium" : "text-slate-500"
                  }`}
                >
                  {formatDate(date, {
                    month: "short",
                    year: undefined,
                    day: undefined,
                  })}
                </div>
                {hasBookings && (
                  <div className="flex flex-col gap-1 mt-2">
                    {dateBooking.bookings.slice(0, 3).map((booking, idx) => (
                      <div
                        key={`${booking.id}-${idx}`}
                        className={`h-1 rounded-full ${tripColorMap[booking.tripName]}`}
                        title={booking.tripName}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="pt-4 mt-4 border-t border-slate-200">
          <div className="flex flex-wrap gap-2">
            {Object.entries(tripColorMap).map(([tripName, colorClass]) => (
              <div key={tripName} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${colorClass}`} />
                <span className="text-xs text-slate-700">{tripName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal for selected date bookings */}
      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {formatDate(selectedDate.date, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDate.bookings.length} booking
                  {selectedDate.bookings.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
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
