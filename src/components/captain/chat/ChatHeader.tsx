"use client";

import { BookingActions } from "@/app/(portal)/captain/bookings/BookingActions";
import { BookingStatusBadge } from "@/components/captain/BookingStatusBadge";
import { Button } from "@/components/ui/button";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ChatHeaderProps {
  anglerName: string;
  charterName: string;
  anglerAvatar?: string;
  isOnline?: boolean;
  onBack?: () => void;
  booking?: {
    id: string;
    charterName: string;
    date: string;
    days: number;
    adults: number;
    children: number;
    totalPrice: number;
    status?: string;
    bookingFlowType?: string;
    note?: string;
    startTime?: string;
  };
  anglerContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  onCall?: () => void;
  onEmail?: () => void;
  onApprove?: (bookingId: string) => Promise<void>;
  onReject?: (bookingId: string, reason: string) => Promise<void>;
}

/**
 * ChatHeader Component (Captain View)
 *
 * Top bar of chat interface showing angler name and charter context
 * Includes collapsible booking details when booking is provided
 */
export function ChatHeader({
  anglerName,
  charterName,
  anglerAvatar,
  isOnline = false,
  onBack,
  booking,
  anglerContact,
  onCall,
  onEmail,
}: ChatHeaderProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white">
      {/* Main Header Bar */}
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center flex-1 min-w-0 gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="flex-shrink-0"
              aria-label="Back to messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          {anglerAvatar && (
            <Image
              src={anglerAvatar}
              alt={`${anglerName}'s avatar`}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 truncate">
              {anglerName}
            </h2>
            <p className="text-xs text-gray-500 truncate">
              {charterName}
              {isOnline && (
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online
                </span>
              )}
            </p>
          </div>
        </div>

        {booking && (
          <div className="hidden mr-5 md:flex">
            <BookingStatusBadge status={booking.status ?? ""} size="md" />
          </div>
        )}

        <div className="flex items-center flex-shrink-0 gap-2">
          {booking && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-shrink-0"
              aria-label="Toggle booking details"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </Button>
          )}
        </div>
      </div>

      {/* Collapsible Booking Details */}
      {booking && isExpanded && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-200 bg-gradient-to-br from-white to-gray-100">
          {/* Trip Details */}
          <p className="text-xs font-semibold text-gray-700 uppercase">
            Trip Details
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex items-start gap-2">
              <Calendar
                className={`text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4`}
              />
              <div className="min-w-0">
                <div className={`text-slate-500 text-xs`}>Date</div>
                <div className={`font-medium text-slate-900 text-sm`}>
                  <span>
                    {new Date(booking.date).toLocaleDateString("en-MY", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "Asia/Kuala_Lumpur",
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
                        timeZone: "Asia/Kuala_Lumpur",
                      })}
                    </span>
                  )}
                </div>
                <div className={`text-slate-600 text-xs`}>
                  {booking.days} day{booking.days !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {booking.startTime && (
              <div className="flex items-start gap-2">
                <Clock
                  className={`text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4`}
                />
                <div className="min-w-0">
                  <div className={`text-slate-500 text-xs`}>Time</div>
                  <div className={`font-medium text-slate-900 text-sm`}>
                    {convert24to12Hour(booking.startTime)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Users
                className={`text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4`}
              />
              <div className="min-w-0">
                <div className={`text-slate-500 text-xs`}>Guests</div>
                <div className={`font-medium text-slate-900 text-sm`}>
                  {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                  {booking.children > 0 &&
                    `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <CircleDollarSign
                className={`text-slate-400 mt-0.5 flex-shrink-0 w-4 h-4`}
              />
              <div className="min-w-0">
                <div className={`text-slate-500 text-xs`}>Total Price</div>
                <div className={`font-semibold text-slate-900 text-sm`}>
                  RM {booking.totalPrice.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Angler Contact */}
          {booking.status === "PAID" && anglerContact && (
            <div className="pt-4 border-t border-gray-200">
              <p className="mb-2 text-xs font-semibold text-gray-700 uppercase">
                Angler Contact
              </p>
              <div className="space-y-2">
                {anglerContact.phone && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="w-4 h-4" />
                      {anglerContact.phone}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={onCall}
                    >
                      Call
                    </Button>
                  </div>
                )}
                {anglerContact.email && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-gray-700 truncate">
                      <Mail className="flex-shrink-0 w-4 h-4" />
                      <span className="truncate">{anglerContact.email}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 text-xs"
                      onClick={onEmail}
                    >
                      Email
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      {/* Special Requests */}
      {booking && (
        <div className="flex flex-col w-full">
          <Link
            href={`/captain/bookings/${booking.id}`}
            className="inline-flex items-center justify-center flex-1 px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border-gray-200 border-y hover:bg-gray-50 hover:border-gray-400"
            prefetch={false}
          >
            View Full Booking Details
          </Link>

          {booking.note && (
            <div className="px-4 py-2 border-t border-gray-200 bg-amber-50">
              <p className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700 uppercase">
                <MessageSquare className="w-3 h-3" />
                Special Requests
              </p>
              <p className="text-sm text-gray-800">{booking.note}</p>
            </div>
          )}

          {/* Actions */}
          <div className="px-5 pt-3">
            {(booking.status === "PAYMENT_AUTHORIZED" ||
              booking.status === "PENDING") && (
              <BookingActions
                bookingId={booking.id}
                status={booking.status}
                flowType={booking.bookingFlowType}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
