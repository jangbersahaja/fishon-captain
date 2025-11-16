"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/helpers/booking-helpers";
import { format } from "date-fns";
import { ArrowRight, Calendar, Clock, Users } from "lucide-react";
import Link from "next/link";

interface Booking {
  id: string;
  guestName: string;
  totalPrice: number;
  tripDate: Date;
  tripTime: string;
  status: string;
  adults: number;
  children: number;
  tripName: string;
  createdAt: Date;
}

interface RecentBookingsProps {
  bookings: Booking[];
  charterId: string;
}

const getStatusColor = (status: string) => {
  const statusLower = status.toLowerCase();

  if (statusLower === "confirmed" || statusLower === "paid") {
    return "bg-green-100 text-green-700 border-green-200";
  }
  if (statusLower === "pending" || statusLower === "payment_authorized") {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
  if (statusLower === "cancelled" || statusLower === "rejected") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (statusLower === "completed") {
    return "bg-blue-100 text-blue-700 border-blue-200";
  }

  return "bg-slate-100 text-slate-700 border-slate-200";
};

const formatStatus = (status: string) => {
  // Convert snake_case to Title Case
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

export function RecentBookings({ bookings, charterId }: RecentBookingsProps) {
  if (bookings.length === 0) {
    return (
      <div className="p-6 text-center border border-dashed rounded-lg bg-slate-50 border-slate-300">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm font-medium text-slate-600">No bookings yet</p>
        <p className="text-xs text-slate-500">
          Bookings will appear here once customers book this charter
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="p-3 transition-colors border rounded-lg bg-slate-50 border-slate-200 hover:bg-slate-100"
        >
          {/* Header: Guest Name & Status */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-slate-900">
                {booking.guestName}
              </p>
              <p className="text-xs text-slate-500">{booking.tripName}</p>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ml-2 flex-shrink-0 ${getStatusColor(booking.status)}`}
            >
              {formatStatus(booking.status)}
            </Badge>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Trip Date */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{format(booking.tripDate, "MMM d, yyyy")}</span>
            </div>

            {/* Trip Time */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{booking.tripTime}</span>
            </div>

            {/* Guests Count */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <Users className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {booking.adults + booking.children} guest
                {booking.adults + booking.children !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Price */}
            <div className="text-right">
              <span className="font-medium text-slate-900">
                {formatCurrency(booking.totalPrice)}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* View All Bookings Link */}
      {bookings.length > 0 && (
        <Link href={`/captain/account/bookings?charterId=${charterId}`}>
          <Button variant="outline" size="sm" className="w-full mt-2">
            View All Bookings
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      )}
    </div>
  );
}
