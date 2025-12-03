"use client";

import { BookingActions } from "@/app/(portal)/captain/bookings/BookingActions";
import { CaptainCancelDialog } from "@/app/(portal)/captain/bookings/CaptainCancelDialog";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import {
  CircleDollarSign,
  Clock,
  MessageSquareText,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BookingStatusBadge } from "./BookingStatusBadge";

interface EnhancedBookingCardProps {
  booking: EnrichedMarketBooking;
  anglerInfo?: {
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  showTimeline?: boolean;
  priority?: "high" | "medium" | "low";
  viewDensity?: "comfortable" | "compact";
}

export function EnhancedBookingCard({
  booking,
  anglerInfo,
  showTimeline: _showTimeline = false,
  priority,
  viewDensity = "comfortable",
}: EnhancedBookingCardProps) {
  // For now, we won't show the timeline
  const [isExpanded, _setIsExpanded] = useState(false);
  const isGuest = !booking.userId;

  // Get guest name from new structure (primaryBooker)
  const anglerName =
    anglerInfo?.name ||
    (booking.primaryBooker ? booking.primaryBooker.name : null);

  // Get email from angler info (guest email not stored in booking anymore)
  const anglerEmail = anglerInfo?.email || null;

  const isCompact = viewDensity === "compact";

  // Debug logging for conversation status
  console.log(`[EnhancedBookingCard] Booking ${booking.id}:`, {
    conversationId: booking.conversationId,
    conversationStatus: booking.conversationStatus,
    shouldShowButton: !!(
      booking.conversationId && booking.conversationStatus === "ACTIVE"
    ),
  });

  return (
    <div
      className={`rounded-xl border bg-white transition-all hover:shadow-md ${
        isCompact ? "p-3" : "p-4"
      } ${
        priority === "high"
          ? "border-red-300 bg-red-50/30"
          : priority === "medium"
            ? "border-yellow-300 bg-yellow-50/30"
            : "border-slate-200"
      }`}
    >
      {/* Desktop Layout - Horizontal, Compact */}
      <div className="hidden sm:block">
        <div className="flex items-start gap-4">
          {/* Left: Main Info */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header Row */}
            <div className="flex items-center gap-3">
              {booking.formattedTimeSlots && (
                <div className="flex flex-col items-center justify-center px-3 py-2 text-white rounded-lg bg-[#ec2227] w-16">
                  <h2 className="flex-shrink-0 text-4xl font-semibold uppercase font-oswald">
                    {booking.formattedTimeSlots[0].split(" ")[3]}
                  </h2>
                  <h3 className="flex-shrink-0 font-semibold uppercase font-oswald">
                    {booking.formattedTimeSlots[0].split(" ")[4]}
                  </h3>
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`font-semibold text-slate-900 truncate ${isCompact ? "text-base" : "text-lg"}`}
                  >
                    {booking.tripName}
                  </h3>
                  <BookingStatusBadge
                    status={booking.status}
                    size={isCompact ? "sm" : "md"}
                  />
                </div>
                <div
                  className={`text-slate-600 truncate ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  {booking.charterName}
                </div>
              </div>
              {/* Big Date i.e 27 Dec */}
            </div>
            {/* Angler Info */}
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50/80">
              <Image
                src={anglerInfo?.image || "/angler.svg"}
                alt={anglerName || "Angler"}
                width={32}
                height={32}
                className="object-cover rounded-full ring-2 ring-white"
              />
              <div className="flex-1 min-w-0">
                <span
                  className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  {anglerName || "Angler"}
                </span>
                {isGuest && (
                  <span className="ml-1.5 text-xs text-slate-500">(Guest)</span>
                )}
                {booking.status === "PAID" && anglerEmail && (
                  <div className="text-xs truncate text-slate-600">
                    {anglerEmail}
                  </div>
                )}
              </div>
            </div>

            {/* Trip Details - Same as Mobile */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Time Slots (rich schedule) */}
              {booking.formattedTimeSlots &&
                booking.formattedTimeSlots.length > 0 && (
                  <div className="col-span-2 px-3 py-2 space-y-1 rounded-lg bg-slate-50">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Trip Schedule</span>
                    </div>
                    <ul className="ml-5 space-y-0.5 list-disc">
                      {booking.formattedTimeSlots.map((slot) => (
                        <li key={slot} className="text-xs text-slate-700">
                          {slot}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <div className="px-3 py-2 space-y-1 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Guests</span>
                </div>
                <span
                  className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children > 0 &&
                    `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                </span>
              </div>

              <div className="px-3 py-2 space-y-1 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <CircleDollarSign className="w-3.5 h-3.5 text-slate-500" />
                  <span>Total Earning</span>
                </div>
                <span
                  className={`font-semibold text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  RM {(booking.captainEarnings ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Guest Note - Prominent Display */}
            {booking.note && (
              <div className="p-3 border-2 rounded-lg border-amber-300 bg-amber-50">
                <div className="flex items-start gap-2">
                  <MessageSquareText className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 text-xs font-semibold text-amber-800">
                      Message from Angler
                    </div>
                    <div className="text-sm text-amber-900">{booking.note}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions - Horizontal at Bottom */}
            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-100">
              <Link
                href={`/captain/bookings/${booking.id}`}
                className={`inline-flex items-center justify-center px-4 font-medium text-slate-700 transition-colors bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 flex-1 ${isCompact ? "py-1.5 text-xs" : "py-1.5 text-sm"}`}
                prefetch={false}
              >
                View Details
              </Link>

              {(booking.status === "PENDING" ||
                booking.status === "PAYMENT_AUTHORIZED") && (
                <BookingActions
                  bookingId={booking.id}
                  status={booking.status}
                  flowType={booking.bookingFlowType}
                />
              )}

              {/* Cancel action for confirmed PAID bookings */}
              {booking.status === "PAID" && (
                <CaptainCancelDialog
                  bookingId={booking.id}
                  charterName={booking.charterName}
                />
              )}

              {booking.conversationId &&
                booking.conversationStatus === "ACTIVE" && (
                  <Link
                    href={`/captain/messages/${booking.conversationId}`}
                    className={`inline-flex items-center justify-center px-4 font-medium transition-colors border rounded-lg flex-1 bg-slate-900 text-white border-slate-900 hover:bg-slate-800 hover:border-slate-800 ${isCompact ? "py-1.5 text-xs" : "py-1.5 text-sm"}`}
                    prefetch={false}
                  >
                    Message Angler
                  </Link>
                )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Vertical, Full Info */}
      <div className="space-y-3 sm:hidden">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Big Date i.e 27 Dec */}
          {booking.formattedTimeSlots && (
            <div className="flex flex-col items-center justify-center px-3 py-2 text-white rounded-lg bg-[#ec2227] w-16">
              <h2 className="flex-shrink-0 text-4xl font-semibold uppercase font-oswald">
                {booking.formattedTimeSlots[0].split(" ")[3]}
              </h2>
              <h3 className="flex-shrink-0 font-semibold uppercase font-oswald">
                {booking.formattedTimeSlots[0].split(" ")[4]}
              </h3>
            </div>
          )}
          <div>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">
              {booking.tripName}
            </h3>
            <div className="mb-2 text-sm text-slate-600">
              {booking.charterName}
            </div>
            <BookingStatusBadge status={booking.status} size="sm" />
          </div>
        </div>

        {/* Angler Info with Image */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50">
          <Image
            src={anglerInfo?.image || "/angler.svg"}
            alt={anglerName || "Angler"}
            width={40}
            height={40}
            className="object-cover rounded-full ring-2 ring-white"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">
              {anglerName || "Angler"}
              {isGuest && (
                <span className="ml-1.5 text-slate-500">(Guest)</span>
              )}
            </div>
            {booking.status === "PAID" && anglerEmail && (
              <div className="text-xs truncate text-slate-600">
                {anglerEmail}
              </div>
            )}
          </div>
        </div>

        {/* Trip Details */}
        <div className="grid grid-cols-2 gap-3">
          {/* Time Slots (rich schedule) */}
          {booking.formattedTimeSlots &&
            booking.formattedTimeSlots.length > 0 && (
              <div className="col-span-2 px-3 py-2 space-y-1 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Trip Schedule</span>
                </div>
                <ul className="ml-5 space-y-0.5 list-disc">
                  {booking.formattedTimeSlots.map((slot) => (
                    <li key={slot} className="text-xs text-slate-700">
                      {slot}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          <div className="px-3 py-2 space-y-1 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Guests</span>
            </div>
            <span
              className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
            >
              {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
              {booking.children > 0 &&
                `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
            </span>
          </div>

          <div className="px-3 py-2 space-y-1 rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CircleDollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>Total Earning</span>
            </div>
            <span
              className={`font-semibold text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
            >
              RM {(booking.captainEarnings ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Guest Note - Prominent Display */}
        {booking.note && (
          <div className="p-3 border-2 rounded-lg border-amber-300 bg-amber-50">
            <div className="flex items-start gap-2">
              <MessageSquareText className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="mb-1 text-xs font-semibold text-amber-800">
                  Message from Angler
                </div>
                <div className="text-sm text-amber-900">{booking.note}</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
          <Link
            href={`/captain/bookings/${booking.id}`}
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
            prefetch={false}
          >
            View Full Details
          </Link>

          {(booking.status === "PENDING" ||
            booking.status === "PAYMENT_AUTHORIZED") && (
            <BookingActions
              bookingId={booking.id}
              status={booking.status}
              flowType={booking.bookingFlowType}
            />
          )}

          {/* Cancel action for confirmed PAID bookings */}
          {booking.status === "PAID" && (
            <CaptainCancelDialog
              bookingId={booking.id}
              charterName={booking.charterName}
            />
          )}

          {booking.conversationId &&
            booking.conversationStatus === "ACTIVE" && (
              <Link
                href={`/captain/messages/${booking.conversationId}`}
                className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium text-white transition-colors border rounded-lg bg-slate-900 border-slate-900 hover:bg-slate-800 hover:border-slate-800"
                prefetch={false}
              >
                Message Angler
              </Link>
            )}
        </div>
      </div>
    </div>
  );
}
