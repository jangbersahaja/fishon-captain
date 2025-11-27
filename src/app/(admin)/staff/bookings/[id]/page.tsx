import { BookingFlowBadge } from "@/components/staff/BookingFlowBadge";
import { BookingStatusBadge } from "@/components/staff/BookingStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth";
import { getBooking } from "@/lib/booking-service";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MapPin,
  Phone,
  Ship,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminActionsPanel } from "./_components/AdminActionsPanel";
import { AdminNotesCard } from "./_components/AdminNotesCard";
import { AuditTrailCard } from "./_components/AuditTrailCard";
import { ConversationPreviewCard } from "./_components/ConversationPreviewCard";

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return Clock;
    case "PAYMENT_AUTHORIZED":
    case "PAID":
      return CheckCircle2;
    case "REJECTED":
    case "CANCELLED":
      return XCircle;
    default:
      return Clock;
  }
}

function getDaysGapLabel(eventDate: Date, tripDate: Date) {
  const diffTime = new Date(tripDate).getTime() - new Date(eventDate).getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Same day";
  if (diffDays > 0) return `${diffDays} days before trip`;
  return `${Math.abs(diffDays)} days after trip`;
}

export default async function StaffBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const { id } = await params;

  // Fetch booking
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  const StatusIcon = getStatusIcon(booking.status);
  const guestName = booking.primaryBooker?.name || "Guest";
  const isGuest = !booking.userId;

  return (
    <div className="px-6 py-8 mx-auto space-y-6" key={booking.id}>
      {/* Back Link */}
      <Link
        href="/staff/bookings"
        className="inline-flex items-center gap-2 text-sm transition-colors text-slate-600 hover:text-slate-900"
        prefetch={false}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {booking.charterName}
            </h1>
            <BookingStatusBadge status={booking.status} size="lg" />
            <BookingFlowBadge flowType={booking.bookingFlowType} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Booking ID: <span className="font-mono">{booking.id}</span>
          </p>
          <p className="text-sm text-slate-600">
            Created: {formatDateTime(booking.createdAt)}
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Ship className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Charter</p>
                  <p className="text-sm text-slate-900">
                    {booking.charterName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Trip</p>
                  <p className="text-sm text-slate-900">{booking.tripName}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Date</p>
                  <p className="text-sm text-slate-900">
                    {formatDate(booking.date)}
                    {booking.days > 1 &&
                      ` - ${formatDate(
                        new Date(
                          new Date(booking.date).getTime() +
                            booking.days * 24 * 60 * 60 * 1000
                        )
                      )}`}
                  </p>
                  {booking.days > 1 && (
                    <p className="text-sm text-slate-600">
                      {booking.days} days
                    </p>
                  )}
                </div>
              </div>

              {booking.formattedTimeSlots &&
                booking.formattedTimeSlots.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        Trip Schedule ({booking.formattedTimeSlots.length}{" "}
                        {booking.formattedTimeSlots.length === 1
                          ? "session"
                          : "sessions"}
                        )
                      </p>
                      <div className="space-y-2">
                        {booking.formattedTimeSlots.map((slot, index) => (
                          <div
                            key={index}
                            className="p-2 text-sm rounded text-slate-600 bg-slate-50"
                          >
                            {slot}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Guests</p>
                  <p className="text-sm text-slate-900">
                    {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                    {booking.children > 0 &&
                      `, ${booking.children} child${booking.children !== 1 ? "ren" : ""}`}
                  </p>
                </div>
              </div>

              {booking.allParticipants &&
                booking.allParticipants.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        Participants
                      </p>
                      <div className="space-y-1.5">
                        {booking.allParticipants.map((participant, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm text-slate-600"
                          >
                            <span className="capitalize">
                              {participant.name}
                            </span>
                            {participant.phone && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="font-mono text-xs">
                                  {participant.phone}
                                </span>
                              </>
                            )}
                            {participant.isBooker && (
                              <Badge variant="outline" className="text-xs">
                                Booker
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {booking.note && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Guest Note
                    </p>
                    <p className="text-sm text-slate-600">{booking.note}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Booking Created */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="p-2 rounded-full bg-green-50">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="w-px h-full bg-slate-200" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-slate-900">
                          Booking Created
                        </p>
                        <p className="text-sm text-slate-600">
                          {formatDateTime(booking.createdAt)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Guest created booking request
                        </p>
                      </div>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                        {getDaysGapLabel(booking.createdAt, booking.date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Captain Decision */}
                {booking.captainDecisionAt && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`rounded-full p-2 ${
                          booking.status === "REJECTED"
                            ? "bg-red-50"
                            : "bg-green-50"
                        }`}
                      >
                        {booking.status === "REJECTED" ? (
                          <XCircle className="w-5 h-5 text-red-600" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                      <div className="w-px h-full bg-slate-200" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-900">
                            {booking.status === "REJECTED"
                              ? "Rejected"
                              : "Approved"}
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDateTime(booking.captainDecisionAt)}
                          </p>
                          {booking.rejectionReason && (
                            <p className="mt-1 text-sm text-red-600">
                              {booking.rejectionReason}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {getDaysGapLabel(
                            booking.captainDecisionAt,
                            booking.date
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Confirmed */}
                {booking.paymentCapturedAt && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="p-2 rounded-full bg-green-50">
                        <DollarSign className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="w-px h-full bg-slate-200" />
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-900">
                            Payment Confirmed
                          </p>
                          <p className="text-sm text-slate-600">
                            {formatDateTime(booking.paymentCapturedAt)}
                          </p>
                          <p className="text-sm text-slate-500">
                            {booking.paymentMethod} •{" "}
                            {booking.paymentTransactionId}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {getDaysGapLabel(
                            booking.paymentCapturedAt,
                            booking.date
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trip Date */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="p-2 rounded-full bg-blue-50">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Trip Scheduled</p>
                    <p className="text-sm text-slate-600">
                      {formatDate(booking.date)}
                    </p>
                    <p className="text-sm text-slate-500">{booking.tripName}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Tracking */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-600">Method</p>
                  <p className="font-medium text-slate-900">
                    {booking.paymentMethod || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Flow</p>
                  <p className="font-medium text-slate-900">
                    {booking.paymentFlow || "N/A"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-600">Transaction ID</p>
                  <p className="font-mono text-xs text-slate-900">
                    {booking.paymentTransactionId || "N/A"}
                  </p>
                </div>
              </div>

              {booking.paymentAuthorizedAt && (
                <div className="p-3 border rounded-lg bg-slate-50 border-slate-200">
                  <p className="text-sm font-medium text-slate-900">
                    Authorization Hold
                  </p>
                  <p className="text-xs text-slate-600">
                    Authorized: {formatDateTime(booking.paymentAuthorizedAt)}
                  </p>
                </div>
              )}

              {booking.paymentCapturedAt && (
                <div className="p-3 border border-green-200 rounded-lg bg-green-50">
                  <p className="text-sm font-medium text-green-800">
                    Payment Captured
                  </p>
                  <p className="text-xs text-green-600">
                    Captured: {formatDateTime(booking.paymentCapturedAt)}
                  </p>
                </div>
              )}

              {booking.refundStatus && (
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <p className="text-sm font-medium text-red-800">
                    Refund: {booking.refundStatus}
                  </p>
                  {booking.refundAmount && (
                    <p className="text-xs text-red-600">
                      Amount: RM {Number(booking.refundAmount).toFixed(2)}
                    </p>
                  )}
                  {booking.refundReason && (
                    <p className="mt-1 text-xs text-red-600">
                      {booking.refundReason}
                    </p>
                  )}
                </div>
              )}

              {booking.paymentNote && (
                <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        Payment Note
                      </p>
                      <p className="text-xs text-yellow-700">
                        {booking.paymentNote}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversation Preview */}
          <ConversationPreviewCard bookingId={booking.id} />

          {/* Audit Trail */}
          <AuditTrailCard bookingId={booking.id} />
        </div>

        {/* Right Column - Actions & Context */}
        <div className="space-y-6">
          {/* Admin Actions Panel */}
          <AdminActionsPanel
            bookingId={booking.id}
            status={booking.status}
            hasPayment={
              !!booking.paymentAuthorizedAt || !!booking.paymentCapturedAt
            }
            userRole={role as "STAFF" | "ADMIN"}
            finalPrice={Number(booking.finalPrice)}
          />

          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Trip Price (per day)</span>
                <span className="font-medium text-slate-900">
                  RM {Number(booking.tripPrice).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Days</span>
                <span className="font-medium text-slate-900">
                  {booking.days}
                </span>
              </div>
              {booking.platformFee !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Platform Fee</span>
                  <span className="font-medium text-slate-900">
                    RM {Number(booking.platformFee).toFixed(2)}
                  </span>
                </div>
              )}
              {booking.serviceFee !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Service Fee</span>
                  <span className="font-medium text-slate-900">
                    RM {Number(booking.serviceFee).toFixed(2)}
                  </span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Total Amount
                  </span>
                  <span className="text-lg font-bold text-slate-900">
                    RM {Number(booking.finalPrice).toFixed(2)}
                  </span>
                </div>
              </div>
              {booking.captainEarnings !== null && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      Captain Earnings
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      RM {Number(booking.captainEarnings).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
                  <User className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-base font-semibold capitalize text-slate-900">
                    {guestName}
                  </p>
                  {isGuest && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Guest Booking
                    </Badge>
                  )}
                </div>
              </div>

              {booking.primaryBooker?.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-1 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Phone</p>
                    <a
                      href={`tel:${booking.primaryBooker.phone}`}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {booking.primaryBooker.phone}
                    </a>
                  </div>
                </div>
              )}

              {!isGuest && (
                <div className="p-3 text-xs rounded-lg bg-slate-50 text-slate-600">
                  Full contact details available for registered users only
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <AdminNotesCard
            bookingId={booking.id}
            existingNotes={booking.reviewNotes}
          />
        </div>
      </div>
    </div>
  );
}
