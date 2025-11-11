"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Calendar,
  ChevronDown,
  Mail,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import { useState } from "react";

export interface BookingDetailsCardProps {
  booking: {
    id: string;
    charterName: string;
    date: string;
    days: number;
    guests: number;
    totalPrice: number;
    status?: string;
  };
  anglerContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  specialRequests?: string;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  onCall?: () => void;
  onEmail?: () => void;
  onApprove?: (bookingId: string) => Promise<void>;
  onReject?: (bookingId: string, reason: string) => Promise<void>;
}

/**
 * BookingDetailsCard Component (Captain View)
 *
 * Shows booking information and angler contact details in chat
 * Can be collapsed/expanded for mobile
 * Captain can call/email angler directly
 * Captain can approve/reject pending bookings
 */
export function BookingDetailsCard({
  booking,
  anglerContact,
  specialRequests,
  isExpanded = true,
  onToggle,
  onCall,
  onEmail,
  onApprove,
  onReject,
}: BookingDetailsCardProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const isPending = booking.status === "PENDING";

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(booking.id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    const reason =
      window.prompt("Reason for rejection (optional):") ||
      "Not available at this time";
    setIsRejecting(true);
    try {
      await onReject(booking.id, reason);
    } finally {
      setIsRejecting(false);
    }
  };

  // Status badge color
  const statusColor = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    APPROVED: "bg-blue-100 text-blue-800 border-blue-200",
    PAID: "bg-green-100 text-green-800 border-green-200",
    COMPLETED: "bg-gray-100 text-gray-800 border-gray-200",
    REJECTED: "bg-red-100 text-red-800 border-red-200",
    CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
    EXPIRED: "bg-gray-100 text-gray-800 border-gray-200",
  }[booking.status || "PENDING"];

  return (
    <Card className="m-4 overflow-hidden border-gray-200 bg-gradient-to-br from-white to-gray-50">
      <button
        onClick={() => onToggle?.(!isExpanded)}
        className="flex items-center justify-between w-full px-4 py-3 transition hover:bg-gray-100"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">
              {booking.charterName}
            </h3>
            {booking.status && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}
              >
                {booking.status}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(booking.date).toLocaleDateString("en-MY", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {booking.guests} guests
            </span>
            <span className="font-semibold text-gray-900">
              RM {booking.totalPrice.toLocaleString()}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-3 space-y-4 border-t border-gray-200">
          {/* Angler Contact */}
          {anglerContact && (
            <div className="p-3 border border-gray-200 rounded-lg bg-white">
              <p className="mb-2 text-xs font-semibold text-gray-700 uppercase">
                Angler Contact
              </p>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {anglerContact.name}
                </p>
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
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{anglerContact.email}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-shrink-0"
                      onClick={onEmail}
                    >
                      Email
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Requests */}
          {specialRequests && (
            <div className="p-3 border border-gray-200 rounded-lg bg-amber-50">
              <p className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700 uppercase">
                <MessageSquare className="w-3 h-3" />
                Special Requests
              </p>
              <p className="text-sm text-gray-800">{specialRequests}</p>
            </div>
          )}

          {/* Action buttons for pending bookings */}
          {isPending && onApprove && onReject && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 text-sm bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={isApproving || isRejecting}
              >
                {isApproving ? "Approving..." : "✅ Approve Booking"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 text-sm"
                onClick={handleReject}
                disabled={isApproving || isRejecting}
              >
                {isRejecting ? "Rejecting..." : "❌ Reject"}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
