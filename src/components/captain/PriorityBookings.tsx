"use client";

import type { PriorityBooking } from "@/lib/booking-priority";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
} from "lucide-react";
import { useState } from "react";
import { EnhancedBookingCard } from "./EnhancedBookingCard";

interface PriorityBookingsProps {
  priorityBookings: PriorityBooking[];
  anglerMap: Record<
    string,
    {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }
  >;
}

export function PriorityBookings({
  priorityBookings,
  anglerMap,
}: PriorityBookingsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (priorityBookings.length === 0) {
    return null; // No priority items, don't show section
  }

  const newRequests = priorityBookings.filter((p) => p.type === "new-request");
  const upcomingTrips = priorityBookings.filter(
    (p) => p.type === "upcoming-trip"
  );
  const paymentPending = priorityBookings.filter(
    (p) => p.type === "payment-pending"
  );

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-amber-500 p-2">
            <AlertCircle className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-amber-900">
              ⚡ Needs Attention
            </h2>
            <p className="text-sm text-amber-700">
              {priorityBookings.length}{" "}
              {priorityBookings.length === 1 ? "item" : "items"} requiring your
              attention
            </p>
          </div>
        </div>
        {isCollapsed ? (
          <ChevronDown className="h-5 w-5 text-amber-700" />
        ) : (
          <ChevronUp className="h-5 w-5 text-amber-700" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-6 pb-6 space-y-4">
          {/* Summary Pills */}
          <div className="flex flex-wrap gap-2">
            {newRequests.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                {newRequests.length} New Request
                {newRequests.length !== 1 ? "s" : ""}
              </div>
            )}
            {upcomingTrips.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5" />
                {upcomingTrips.length} Upcoming Trip
                {upcomingTrips.length !== 1 ? "s" : ""}
              </div>
            )}
            {paymentPending.length > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
                <CreditCard className="h-3.5 w-3.5" />
                {paymentPending.length} Payment Pending
              </div>
            )}
          </div>

          {/* Priority Items */}
          <div className="space-y-3">
            {priorityBookings.map((priority) => {
              const angler = priority.booking.userId
                ? anglerMap[priority.booking.userId]
                : null;

              return (
                <div key={priority.id} className="relative">
                  {/* Type indicator */}
                  <div className="absolute -left-3 top-6">
                    {priority.type === "new-request" && (
                      <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold">
                        !
                      </div>
                    )}
                    {priority.type === "upcoming-trip" && (
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {priority.type === "payment-pending" && (
                      <div className="h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center text-white">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Countdown badge */}
                  {priority.countdown && (
                    <div className="absolute -right-2 -top-2 z-10">
                      <div className="px-2 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {priority.countdown}
                      </div>
                    </div>
                  )}

                  <EnhancedBookingCard
                    booking={priority.booking}
                    anglerInfo={angler}
                    showTimeline={false}
                    priority={priority.urgency}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
