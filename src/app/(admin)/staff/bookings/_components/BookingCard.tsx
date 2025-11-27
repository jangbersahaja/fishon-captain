import { BookingFlowBadge } from "@/components/staff/BookingFlowBadge";
import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import type { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { Calendar, CreditCard, User } from "lucide-react";
import Link from "next/link";
import { QuickActions } from "./QuickActions";

interface BookingCardProps {
  booking: EnrichedMarketBooking;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  return formatDate(date);
}

export function BookingCard({ booking }: BookingCardProps) {
  const guestName = booking.primaryBooker?.name || "Guest";
  const isGuest = !booking.userId;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <BookingStatusBadge status={booking.status} />
            <h3 className="mt-2 font-semibold text-slate-900">
              {booking.charterName}
            </h3>
            <p className="text-sm text-slate-600">{booking.tripName}</p>
          </div>
          <BookingFlowBadge flowType={booking.bookingFlowType} size="sm" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <User className="w-4 h-4 text-slate-400" />
            <span className="capitalize">{guestName}</span>
            {isGuest && (
              <Badge variant="outline" className="text-xs">
                Guest
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              {formatDate(booking.date)} • {booking.days} day
              {booking.days !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>
              RM {Number(booking.finalPrice).toFixed(2)} •{" "}
              {booking.paymentMethod || "N/A"}
            </span>
          </div>
          <div className="pt-2 mt-2 text-xs border-t text-slate-500 border-slate-200">
            <div>
              ID: <span className="font-mono">{booking.id}</span>
            </div>
            <div>Created: {formatRelativeTime(booking.createdAt)}</div>
          </div>

          {/* Quick Actions for Pending Bookings */}
          <QuickActions
            bookingId={booking.id}
            status={booking.status}
            guestName={guestName}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Link href={`/staff/bookings/${booking.id}`} className="w-full">
          <Button variant="outline" size="sm" className="w-full">
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
