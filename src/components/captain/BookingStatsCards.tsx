"use client";

import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";

interface BookingStatsCardsProps {
  bookings: EnrichedMarketBooking[];
}

interface TripBreakdown {
  tripName: string;
  count: number;
}

export function BookingStatsCards({ bookings }: BookingStatsCardsProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const now = new Date();

  // Requests (PENDING) - breakdown by trip
  const pendingBookings = bookings.filter((b) => b.status === "PENDING");
  const requestsByTrip = pendingBookings.reduce(
    (acc, b) => {
      acc[b.tripName] = (acc[b.tripName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const requestsBreakdown: TripBreakdown[] = Object.entries(requestsByTrip)
    .map(([tripName, count]) => ({ tripName, count }))
    .sort((a, b) => b.count - a.count);

  // Upcoming (AWAITING_PAYMENT + PAID with future dates) - breakdown by trip
  const upcomingBookings = bookings.filter((b) => {
    if (b.status !== "AWAITING_PAYMENT" && b.status !== "PAID") return false;
    const tripDate = new Date(b.date);
    return tripDate >= now;
  });
  const upcomingByTrip = upcomingBookings.reduce(
    (acc, b) => {
      acc[b.tripName] = (acc[b.tripName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const upcomingBreakdown: TripBreakdown[] = Object.entries(upcomingByTrip)
    .map(([tripName, count]) => ({ tripName, count }))
    .sort((a, b) => b.count - a.count);

  // Trips Completed (PAID with past dates, exclude CANCELLED/REJECTED) - breakdown by trip
  const completedBookings = bookings.filter((b) => {
    if (b.status !== "PAID") return false;
    const tripDate = new Date(b.date);
    return tripDate < now;
  });
  const completedByTrip = completedBookings.reduce(
    (acc, b) => {
      acc[b.tripName] = (acc[b.tripName] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const completedBreakdown: TripBreakdown[] = Object.entries(completedByTrip)
    .map(([tripName, count]) => ({ tripName, count }))
    .sort((a, b) => b.count - a.count);

  // Trip Income (PAID bookings only)
  const paidBookings = bookings.filter((b) => b.status === "PAID");
  const tripIncome = paidBookings.reduce(
    (sum, b) => sum + Number(b.captainEarnings),
    0
  );

  // Cancellation Stats
  const cancelledByAngler = bookings.filter((b) => b.status === "CANCELLED");
  const rejectedByCaptain = bookings.filter((b) => b.status === "REJECTED");
  const cancelledAmount = cancelledByAngler.reduce(
    (sum, b) => sum + b.totalPrice,
    0
  );
  const rejectedAmount = rejectedByCaptain.reduce(
    (sum, b) => sum + b.totalPrice,
    0
  );
  const totalBookingsAttempted = bookings.length;
  const totalCancellations =
    cancelledByAngler.length + rejectedByCaptain.length;
  const cancellationRate =
    totalBookingsAttempted > 0
      ? ((totalCancellations / totalBookingsAttempted) * 100).toFixed(1)
      : "0.0";

  const toggleCard = (cardId: string) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {/* Requests */}
      <div className="p-6 transition-shadow bg-white border rounded-2xl border-slate-200 hover:shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-amber-50 p-2.5">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">Requests</p>
            <p className="text-2xl font-semibold text-slate-900">
              {pendingBookings.length}
            </p>
          </div>
        </div>
        {requestsBreakdown.length > 0 && (
          <>
            <button
              onClick={() => toggleCard("requests")}
              className="flex items-center w-full gap-1 mt-2 text-xs text-slate-600 hover:text-slate-900"
            >
              {expandedCard === "requests" ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show breakdown
                </>
              )}
            </button>
            {expandedCard === "requests" && (
              <div className="pt-2 mt-2 space-y-1 border-t border-slate-100">
                {requestsBreakdown.map((item) => (
                  <div
                    key={item.tripName}
                    className="flex justify-between text-xs"
                  >
                    <span className="truncate text-slate-600">
                      {item.tripName}
                    </span>
                    <span className="ml-2 font-medium text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Upcoming */}
      <div className="p-6 transition-shadow bg-white border rounded-2xl border-slate-200 hover:shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">Upcoming</p>
            <p className="text-2xl font-semibold text-slate-900">
              {upcomingBookings.length}
            </p>
          </div>
        </div>
        {upcomingBreakdown.length > 0 && (
          <>
            <button
              onClick={() => toggleCard("upcoming")}
              className="flex items-center w-full gap-1 mt-2 text-xs text-slate-600 hover:text-slate-900"
            >
              {expandedCard === "upcoming" ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show breakdown
                </>
              )}
            </button>
            {expandedCard === "upcoming" && (
              <div className="pt-2 mt-2 space-y-1 border-t border-slate-100">
                {upcomingBreakdown.map((item) => (
                  <div
                    key={item.tripName}
                    className="flex justify-between text-xs"
                  >
                    <span className="truncate text-slate-600">
                      {item.tripName}
                    </span>
                    <span className="ml-2 font-medium text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Trips Completed */}
      <div className="p-6 transition-shadow bg-white border rounded-2xl border-slate-200 hover:shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-green-50 p-2.5">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">Completed</p>
            <p className="text-2xl font-semibold text-slate-900">
              {completedBookings.length}
            </p>
          </div>
        </div>
        {completedBreakdown.length > 0 && (
          <>
            <button
              onClick={() => toggleCard("completed")}
              className="flex items-center w-full gap-1 mt-2 text-xs text-slate-600 hover:text-slate-900"
            >
              {expandedCard === "completed" ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Hide breakdown
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Show breakdown
                </>
              )}
            </button>
            {expandedCard === "completed" && (
              <div className="pt-2 mt-2 space-y-1 border-t border-slate-100">
                {completedBreakdown.map((item) => (
                  <div
                    key={item.tripName}
                    className="flex justify-between text-xs"
                  >
                    <span className="truncate text-slate-600">
                      {item.tripName}
                    </span>
                    <span className="ml-2 font-medium text-slate-900">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Trip Income */}
      <div className="p-6 transition-shadow bg-white border rounded-2xl border-slate-200 hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Trip Income</p>
            <p className="text-2xl font-semibold text-slate-900">
              RM {tripIncome.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {paidBookings.length} paid trips
            </p>
          </div>
        </div>
      </div>

      {/* Cancellation Rate */}
      <div className="p-6 transition-shadow bg-white border rounded-2xl border-slate-200 hover:shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-xl bg-red-50 p-2.5">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600">Cancel Rate</p>
            <p className="text-2xl font-semibold text-slate-900">
              {cancellationRate}%
            </p>
          </div>
        </div>
        <button
          onClick={() => toggleCard("cancellation")}
          className="flex items-center w-full gap-1 mt-2 text-xs text-slate-600 hover:text-slate-900"
        >
          {expandedCard === "cancellation" ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Show details
            </>
          )}
        </button>
        {expandedCard === "cancellation" && (
          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
            <div>
              <div className="text-xs text-slate-600">Cancelled by Anglers</div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="font-medium text-slate-900">
                  {cancelledByAngler.length} bookings
                </span>
                <span className="text-slate-600">
                  RM {cancelledAmount.toLocaleString()}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-600">Rejected by Captain</div>
              <div className="flex justify-between text-xs mt-0.5">
                <span className="font-medium text-slate-900">
                  {rejectedByCaptain.length} bookings
                </span>
                <span className="text-slate-600">
                  RM {rejectedAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
