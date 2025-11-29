import { BookingStatusBadge } from "@/components/captain/BookingStatusBadge";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/services/pricing-service";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Ship,
  User,
  Users,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { BookingActions } from "../BookingActions";
import { CaptainCancelDialog } from "../CaptainCancelDialog";

export const dynamic = "force-dynamic";

// Type for emergency contact in guests JSON
type EmergencyContact = {
  name: string;
  phone?: string;
  relationship?: string;
};

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return Clock;
    case "PAYMENT_AUTHORIZED":
      return CircleDollarSign; // Show money icon for paid bookings
    case "AWAITING_PAYMENT":
    case "PAID":
      return CheckCircle2;
    default:
      return Clock;
  }
}

export default async function BookingDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!session?.user?.id) {
    redirect("/auth?mode=signin");
  }

  // Ensure captain profile exists
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!captain) {
    redirect("/captain");
  }

  // Captain's active charters
  const charters = await prisma.charter.findMany({
    where: { captainId: captain.id, isActive: true },
    select: { id: true, name: true },
  });
  const charterIds = charters.map((c) => c.id);

  // Fetch enriched booking from market DB
  const { getBooking } = await import("@/lib/booking-service");
  const booking = await getBooking(id);

  if (!booking) {
    notFound();
  }

  // Verify this booking belongs to one of captain's charters
  if (!charterIds.includes(booking.charterId)) {
    notFound();
  }

  // Fetch angler info (only for authenticated bookings)
  const { prismaMarket } = await import("@/lib/prisma-market");
  const angler = booking.userId
    ? await prismaMarket.marketUser.findUnique({
        where: { id: booking.userId },
        select: { id: true, name: true, email: true, image: true },
      })
    : null;

  // Get customer info - either from user account or guest details
  const customerName =
    angler?.name || (booking.primaryBooker ? booking.primaryBooker.name : null);
  const customerEmail = angler?.email || null; // Email not stored in booking anymore
  const isGuest = !booking.userId;

  const StatusIcon = getStatusIcon(booking.status);

  // Calculate pricing breakdown
  const pricing = calculatePricing({
    tripPrice: booking.unitPrice,
    days: booking.days,
  });

  // Extract emergency contact for type safety
  const emergencyContact: EmergencyContact | null =
    booking.guests &&
    typeof booking.guests === "object" &&
    "emergencyContact" in booking.guests &&
    booking.guests.emergencyContact
      ? (booking.guests.emergencyContact as EmergencyContact)
      : null;

  return (
    <div className="px-6 py-8 space-y-6" key={booking.id}>
      {/* Back Link */}
      <Link
        href="/captain/bookings"
        className="inline-flex items-center gap-2 text-sm transition-colors text-slate-600 hover:text-slate-900"
        prefetch={false}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="grid grid-cols-1 space-y-5 sm:grid-cols-4">
        <div className="col-span-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {booking.charterName}
            </h1>
            <BookingStatusBadge status={booking.status} size="lg" />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Booking ID: {booking.id}
          </p>
          {/* Payment Flow Info */}
          {(booking.status === "PENDING" ||
            booking.status === "PAYMENT_AUTHORIZED" ||
            booking.status === "PAID") &&
            booking.paymentFlow && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
                  booking.paymentFlow === "TOKENIZED"
                    ? "bg-indigo-50 text-indigo-800"
                    : "bg-yellow-50 text-yellow-800"
                }`}
              >
                {booking.paymentFlow === "TOKENIZED" ? (
                  <>
                    <p className="font-medium">Card Authorization Hold</p>
                    <p className="mt-1 text-xs">
                      {booking.status === "PAYMENT_AUTHORIZED"
                        ? "Payment authorized and held. Approve to capture payment or reject to refund."
                        : "Customer's card is authorized but not charged yet. If you approve, their card will be charged automatically. If you"}{" "}
                      decline or don&apos;t respond within 12 hours, the
                      authorization will be released with no charge.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">Payment Received</p>
                    <p className="mt-1 text-xs">
                      Customer has already paid via{" "}
                      {booking.paymentMethod === "FPX"
                        ? "FPX (Online Banking)"
                        : "E-Wallet"}
                      . If you approve, the booking is confirmed. If you decline
                      or don&apos;t respond within 12 hours, a full refund will
                      be processed automatically.
                    </p>
                  </>
                )}
              </div>
            )}
        </div>
        <div className="col-span-1">
          {(booking.status === "PAYMENT_AUTHORIZED" ||
            booking.status === "PENDING") && (
            <BookingActions
              bookingId={booking.id}
              status={booking.status}
              flowType={booking.bookingFlowType}
            />
          )}
          {/* Captain can cancel confirmed PAID bookings (full refund to angler) */}
          {booking.status === "PAID" && (
            <CaptainCancelDialog
              bookingId={booking.id}
              charterName={booking.charterName}
            />
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Booking Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Status Timeline */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Booking Status
            </h2>
            <div className="flex items-center gap-3">
              <div
                className={`rounded-xl p-2.5 ${
                  booking.status === "PENDING"
                    ? "bg-red-50"
                    : booking.status === "PAYMENT_AUTHORIZED"
                      ? "bg-indigo-50"
                      : booking.status === "AWAITING_PAYMENT"
                        ? "bg-yellow-50"
                        : booking.status === "PAID"
                          ? "bg-green-50"
                          : "bg-red-50"
                }`}
              >
                <StatusIcon
                  className={`h-5 w-5 ${
                    booking.status === "PENDING"
                      ? "text-red-600"
                      : booking.status === "PAYMENT_AUTHORIZED"
                        ? "text-indigo-600"
                        : booking.status === "AWAITING_PAYMENT"
                          ? "text-yellow-600"
                          : booking.status === "PAID"
                            ? "text-green-600"
                            : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-medium text-slate-900">
                  {booking.status === "PENDING"
                    ? "New Request"
                    : booking.status === "PAYMENT_AUTHORIZED"
                      ? "Payment Received"
                      : booking.status === "AWAITING_PAYMENT"
                        ? "Awaiting Payment"
                        : booking.status === "PAID"
                          ? "Confirmed"
                          : booking.status}
                </p>
                <p className="text-sm text-slate-600">
                  {booking.status === "PENDING"
                    ? "Awaiting your response"
                    : booking.status === "PAYMENT_AUTHORIZED"
                      ? "Payment secured - approve to confirm"
                      : booking.status === "AWAITING_PAYMENT"
                        ? "Awaiting payment"
                        : booking.status === "PAID"
                          ? "Confirmed"
                          : booking.status === "REJECTED"
                            ? "Booking declined"
                            : booking.status === "CANCELLED"
                              ? "Cancelled by customer"
                              : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Booking Details
            </h2>
            <div className="space-y-4">
              {/* Trip Name */}
              <div className="flex items-start gap-3">
                <Ship className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Trip</p>
                  <p className="text-sm text-slate-900">{booking.tripName}</p>
                </div>
              </div>

              {/* Guest Name */}
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Guest Name
                  </p>
                  <p className="text-sm capitalize text-slate-900">
                    {customerName || "Not available"}
                  </p>
                </div>
              </div>

              {/* Booking ID */}
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Booking ID
                  </p>
                  <p className="font-mono text-sm text-slate-900">
                    {booking.id}
                  </p>
                </div>
              </div>

              {/* Time Slots or Date */}
              {booking.formattedTimeSlots &&
              booking.formattedTimeSlots.length > 0 ? (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
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
              ) : (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Date</p>
                    <p className="text-sm text-slate-900">
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
                    </p>
                    {booking.days > 0 && (
                      <p className="text-sm text-slate-600">
                        {booking.days} day{booking.days !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Guests */}
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Total Guests
                  </p>
                  <p className="text-sm text-slate-900">
                    {booking.adults} adult{booking.adults !== 1 ? "s" : ""}
                    {booking.children > 0 &&
                      `, ${booking.children} child${
                        booking.children !== 1 ? "ren" : ""
                      }`}
                  </p>
                </div>
              </div>

              {/* Participant List */}
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
                                <p className="flex items-center gap-1.5">
                                  <Phone className="w-3.5 h-3.5" />
                                  <span className="font-mono text-xs">
                                    {participant.phone}
                                  </span>
                                </p>
                              </>
                            )}
                            {participant.isBooker && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                Booker
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Emergency Contact */}
          {emergencyContact && (
            <div className="p-6 bg-white border rounded-2xl border-slate-200">
              <h2 className="mb-4 text-base font-semibold text-slate-900">
                Emergency Contact
              </h2>
              <div className="space-y-3">
                {/* Name */}
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Name</p>
                    <p className="text-sm capitalize text-slate-900">
                      {emergencyContact.name}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                {emergencyContact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Phone
                      </p>
                      <a
                        href={`tel:${emergencyContact.phone}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {emergencyContact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Relationship */}
                {emergencyContact.relationship && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Relationship
                      </p>
                      <p className="text-sm capitalize text-slate-900">
                        {emergencyContact.relationship}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customer Note */}
          {booking.note && (
            <div className="p-6 border border-slate-200 rounded-2xl bg-slate-50">
              <h2 className="mb-2 text-base font-semibold text-slate-700">
                Customer Note
              </h2>
              <p className="text-sm text-slate-700">{booking.note}</p>
            </div>
          )}
        </div>

        {/* Right Column - Pricing & Customer Info */}
        <div className="space-y-6">
          {/* Pricing Breakdown */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Earning
            </h2>
            <div className="space-y-3">
              {/* Trip Price per Day */}

              {/* Your Earnings */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Your Earnings
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-green-600">
                      RM {pricing.captainEarnings.toFixed(2)}
                    </span>
                  </div>
                </div>
                {/* PAID Stamp */}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-900">
                    Status
                  </span>

                  {booking.status === "PAID" ||
                  booking.status === "COMPLETED" ? (
                    <Badge variant="outline" className="text-green-600">
                      PAID
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-600">
                      PENDING
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Customer Information
            </h2>
            <div className="space-y-4">
              {/* Avatar and Name */}
              <div className="flex items-center gap-3">
                <Image
                  src={angler?.image || "/angler.svg"}
                  alt={customerName || "Customer"}
                  width={54}
                  height={54}
                  className="object-cover rounded-full bg-slate-100"
                />
                <div>
                  <p className="text-base font-semibold text-slate-900">
                    {customerName || "Not available"}
                  </p>
                  {isGuest && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      Guest Booking
                    </Badge>
                  )}
                </div>
              </div>

              {booking.status === "PAID" && customerEmail && (
                <>
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-1 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Email
                      </p>
                      <a
                        href={`mailto:${customerEmail}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {customerEmail}
                      </a>
                    </div>
                  </div>
                  {booking.primaryBooker?.phone && (
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-1 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Phone
                        </p>
                        <a
                          href={`tel:${booking.primaryBooker.phone}`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {booking.primaryBooker.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Message Angler Button */}
              {(booking.status === "PAID" || booking.status === "COMPLETED") &&
                booking.conversationId &&
                booking.conversationStatus === "ACTIVE" && (
                  <Link
                    href={`/captain/messages/${booking.conversationId}`}
                    className="inline-flex items-center justify-center flex-1 w-full px-4 py-2 text-sm font-medium text-white transition-colors border rounded-lg bg-slate-900 border-slate-900 hover:bg-slate-800 hover:border-slate-800"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message Angler
                  </Link>
                )}

              {booking.status !== "PAID" && (
                <div className="p-3 text-xs rounded-lg bg-slate-50 text-slate-600">
                  Full contact details will be available after payment is
                  confirmed
                </div>
              )}
            </div>
          </div>

          {/* Booking Timeline */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-slate-700">Created</p>
                <p className="text-slate-600">
                  {new Date(booking.createdAt).toLocaleString("en-MY", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Asia/Kuala_Lumpur",
                  })}
                </p>
              </div>
              {booking.captainDecisionAt && (
                <div>
                  <p className="font-medium text-slate-700">
                    {booking.status === "AWAITING_PAYMENT"
                      ? "Approved"
                      : "Responded"}
                  </p>
                  <p className="text-slate-600">
                    {new Date(booking.captainDecisionAt).toLocaleString(
                      "en-MY",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        timeZone: "Asia/Kuala_Lumpur",
                      }
                    )}
                  </p>
                </div>
              )}
              {booking.status === "PENDING" && (
                <div>
                  <p className="font-medium text-slate-700">Expires </p>
                  <p className="text-slate-600">
                    {new Date(booking.expiresAt).toLocaleString("en-MY", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "Asia/Kuala_Lumpur",
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          {(booking.status === "PAID" || booking.status === "COMPLETED") &&
            booking.paymentTransactionId && (
              <div className="p-6 border border-green-200 rounded-2xl bg-green-50">
                <h2 className="mb-4 text-base font-semibold text-green-900">
                  Payment Verified
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CreditCard className="w-4 h-4 mt-1 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">
                        Payment Method
                      </p>
                      <p className="text-green-700">
                        {booking.paymentMethod || "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-1 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">
                        Transaction ID
                      </p>
                      <p className="font-mono text-xs text-green-700 break-all">
                        {booking.paymentTransactionId}
                      </p>
                    </div>
                  </div>
                  {booking.paymentNote && (
                    <div className="pt-2 border-t border-green-200">
                      <p className="font-medium text-green-800">Payment Note</p>
                      <p className="text-green-700">{booking.paymentNote}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
