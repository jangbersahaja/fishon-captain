"use client";

import { BookingActions } from "@/app/(portal)/captain/bookings/BookingActions";
import { formatDate } from "@/lib/datetime";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { BookingTimeline } from "./BookingTimeline";

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
  showTimeline = false,
  priority,
  viewDensity = "comfortable",
}: EnhancedBookingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
            <div className="">
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
              <div className="flex items-start gap-2">
                <Calendar
                  className={`text-slate-400 mt-0.5 flex-shrink-0 ${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
                  >
                    Date
                  </div>
                  <div
                    className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                  >
                    <span>
                      {new Date(booking.date).toLocaleDateString("en-MY", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {booking.days > 1 && (
                      <span>
                        {" - "}
                        {new Date(
                          new Date(booking.date).getTime() +
                            booking.days * 24 * 60 * 60 * 1000
                        ).toLocaleDateString("en-MY", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <div
                    className={`text-slate-600 ${isCompact ? "text-[10px]" : "text-xs"}`}
                  >
                    {booking.days} day{booking.days !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              {booking.startTime && (
                <div className="flex items-start gap-2">
                  <Clock
                    className={`text-slate-400 mt-0.5 flex-shrink-0 ${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
                    >
                      Time
                    </div>
                    <div
                      className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                    >
                      {convert24to12Hour(booking.startTime)}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Users
                  className={`text-slate-400 mt-0.5 flex-shrink-0 ${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
                  >
                    Guests
                  </div>
                  <div
                    className={`font-medium text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                  >
                    {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                    {booking.children > 0 &&
                      `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CircleDollarSign
                  className={`text-slate-400 mt-0.5 flex-shrink-0 ${isCompact ? "w-3.5 h-3.5" : "w-4 h-4"}`}
                />
                <div className="min-w-0">
                  <div
                    className={`text-slate-500 ${isCompact ? "text-[10px]" : "text-xs"}`}
                  >
                    Total Price
                  </div>
                  <div
                    className={`font-semibold text-slate-900 ${isCompact ? "text-xs" : "text-sm"}`}
                  >
                    RM {booking.totalPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Section - Note & Timeline */}
            {booking.note && (
              <>
                {isExpanded && (
                  <div className="pt-2 mt-2 space-y-2 border-t border-slate-100">
                    {booking.note && (
                      <div className="p-2 border border-blue-100 rounded-lg bg-blue-50">
                        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900">
                          Angler&apos;s Note
                        </div>
                        <div className="text-xs text-blue-800">
                          {booking.note}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-xs transition-colors text-slate-600 hover:text-slate-900"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show More
                    </>
                  )}
                </button>
              </>
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
        <div>
          <h3 className="mb-1 text-lg font-semibold text-slate-900">
            {booking.tripName}
          </h3>
          <div className="mb-2 text-sm text-slate-600">
            {booking.charterName}
          </div>
          <BookingStatusBadge status={booking.status} size="sm" />
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
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Date</div>
              <div className="text-sm font-medium text-slate-900">
                {formatDate(booking.date)}
              </div>
              <div className="text-xs text-slate-600">
                {booking.days} day{booking.days !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {booking.startTime && (
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Time</div>
                <div className="text-sm font-medium text-slate-900">
                  {booking.startTime}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Guests</div>
              <div className="text-sm font-medium text-slate-900">
                {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                {booking.children > 0 &&
                  `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CircleDollarSign className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-slate-500">Total Price</div>
              <div className="text-sm font-semibold text-slate-900">
                RM {booking.totalPrice.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        {booking.note && (
          <div className="p-2.5 border border-slate-200 rounded-lg bg-slate-50">
            <div className="mb-1 text-xs font-semibold text-slate-700">
              Angler&apos;s Note:
            </div>
            <div className="text-sm text-slate-700">{booking.note}</div>
          </div>
        )}

        {/* Timeline */}
        {showTimeline && (
          <div className="pt-3 border-t border-slate-100">
            <BookingTimeline
              status={booking.status}
              createdAt={booking.createdAt}
              updatedAt={booking.updatedAt}
              tripDate={new Date(booking.date)}
              rejectionReason={booking.rejectionReason}
              cancellationReason={booking.cancellationReason}
            />
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
