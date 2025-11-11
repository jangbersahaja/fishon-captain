"use client";

import { BookingActions } from "@/app/(portal)/captain/bookings/BookingActions";
import { Badge } from "@/components/ui/badge";
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

function getStatusColor(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "outline";
    case "APPROVED":
      return "secondary";
    case "PAID":
      return "default";
    case "REJECTED":
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatus(
  status: string
):
  | "New Request"
  | "Awaiting Payment"
  | "Confirmed"
  | "Cancelled"
  | "Rejected"
  | "Completed" {
  switch (status) {
    case "PENDING":
      return "New Request";
    case "APPROVED":
      return "Awaiting Payment";
    case "PAID":
      return "Confirmed";
    case "REJECTED":
      return "Rejected";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Completed";
  }
}

export function EnhancedBookingCard({
  booking,
  anglerInfo,
  showTimeline = true,
  priority,
  viewDensity = "comfortable",
}: EnhancedBookingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isGuest = !booking.userId;
  const anglerName =
    anglerInfo?.name ||
    (booking.guestFirstName && booking.guestLastName
      ? `${booking.guestFirstName} ${booking.guestLastName}`
      : null);
  const anglerEmail = anglerInfo?.email || booking.guestEmail || null;
  const isCompact = viewDensity === "compact";

  return (
    <div
      className={`rounded-xl border bg-white transition-all hover:shadow-md ${
        isCompact ? "p-3" : "p-4"
      } ${
        priority === "high"
          ? "border-red-300 bg-red-50/30"
          : priority === "medium"
            ? "border-amber-300 bg-amber-50/30"
            : "border-slate-200"
      }`}
    >
      {/* Desktop Layout - Horizontal, Compact */}
      <div className="hidden sm:block">
        <div className="flex items-start gap-4">
          {/* Left: Main Info */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`font-semibold text-slate-900 truncate ${isCompact ? "text-base" : "text-lg"}`}
                  >
                    {booking.tripName}
                  </h3>
                  <Badge
                    variant={getStatusColor(booking.status)}
                    className={
                      isCompact ? "text-xs py-0 capitalize" : "capitalize"
                    }
                  >
                    {getStatus(booking.status)}
                  </Badge>
                  {priority && (
                    <Badge
                      variant={
                        priority === "high"
                          ? "destructive"
                          : priority === "medium"
                            ? "secondary"
                            : "outline"
                      }
                      className="py-0.5 text-xs"
                    >
                      {priority === "high"
                        ? "Urgent"
                        : priority === "medium"
                          ? "Priority"
                          : ""}
                    </Badge>
                  )}
                </div>
                <div
                  className={`text-slate-600 truncate ${isCompact ? "text-xs" : "text-sm"}`}
                >
                  {booking.charterName}
                </div>
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
            {(booking.note || showTimeline) && (
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
                    {showTimeline && (
                      <BookingTimeline
                        status={booking.status}
                        createdAt={booking.createdAt}
                        updatedAt={booking.updatedAt}
                        tripDate={new Date(booking.date)}
                        rejectionReason={booking.rejectionReason}
                        cancellationReason={booking.cancellationReason}
                      />
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

              {booking.status === "PENDING" && (
                <BookingActions bookingId={booking.id} />
              )}

              {(booking.status === "APPROVED" || booking.status === "PAID") && (
                <button
                  className={`inline-flex items-center justify-center px-4 font-medium transition-colors border rounded-lg text-slate-700 bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 flex-1 ${isCompact ? "py-1.5 text-xs" : "py-1.5 text-sm"}`}
                  onClick={() => {
                    alert("Contact angler feature coming soon!");
                  }}
                >
                  Contact Angler
                </button>
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              className="capitalize"
              variant={getStatusColor(booking.status)}
            >
              {getStatus(booking.status)}
            </Badge>
            {priority && (
              <Badge
                variant={
                  priority === "high"
                    ? "destructive"
                    : priority === "medium"
                      ? "secondary"
                      : "outline"
                }
                className="text-xs py-0.5"
              >
                {priority === "high"
                  ? "Urgent"
                  : priority === "medium"
                    ? "Priority"
                    : ""}
              </Badge>
            )}
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
          <div className="p-2.5 border border-blue-100 rounded-lg bg-blue-50">
            <div className="mb-1 text-xs font-semibold text-blue-900">
              Angler&apos;s Note:
            </div>
            <div className="text-sm text-blue-800">{booking.note}</div>
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

          {booking.status === "PENDING" && (
            <BookingActions bookingId={booking.id} />
          )}

          {(booking.status === "APPROVED" || booking.status === "PAID") && (
            <button
              className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium transition-colors bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
              onClick={() => {
                alert("Contact angler feature coming soon!");
              }}
            >
              Contact Angler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
