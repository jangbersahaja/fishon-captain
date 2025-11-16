import { BookingTimeline } from "@/components/captain/BookingTimeline";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Ship,
  Users,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookingActions } from "../BookingActions";

export const dynamic = "force-dynamic";

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

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return Clock;
    case "APPROVED":
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
}) {
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
    angler?.name ||
    (booking.primaryBooker ? booking.primaryBooker.name : null);
  const customerEmail = angler?.email || null; // Email not stored in booking anymore
  const isGuest = !booking.userId;

  const StatusIcon = getStatusIcon(booking.status);

  const anglerPaid = Number(booking.finalPrice.toFixed(2));
  const fishonCommission = anglerPaid * 0.1;
  const yourEarning = anglerPaid - fishonCommission;

  return (
    <div className="px-6 py-8 space-y-6">
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
            <Badge variant={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
            {/* Payment Flow Badge */}
            {(booking.status === "PENDING" || booking.status === "PAID") &&
              booking.paymentFlow && (
                <Badge
                  variant="outline"
                  className={
                    booking.paymentFlow === "TOKENIZED"
                      ? "border-blue-300 text-blue-700 bg-blue-50"
                      : "border-green-300 text-green-700 bg-green-50"
                  }
                >
                  {booking.paymentFlow === "TOKENIZED"
                    ? "💳 Card Held"
                    : "✅ Already Paid"}
                </Badge>
              )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Booking ID: {booking.id}
          </p>
          {/* Payment Flow Info */}
          {(booking.status === "PENDING" || booking.status === "PAID") &&
            booking.paymentFlow && (
              <div
                className={`mt-3 p-3 rounded-lg text-sm ${
                  booking.paymentFlow === "TOKENIZED"
                    ? "bg-blue-50 text-blue-800"
                    : "bg-green-50 text-green-800"
                }`}
              >
                {booking.paymentFlow === "TOKENIZED" ? (
                  <>
                    <p className="font-medium">Card Authorization Hold</p>
                    <p className="mt-1 text-xs">
                      Customer&apos;s card is authorized but not charged yet. If
                      you approve, their card will be charged automatically. If
                      you decline or don&apos;t respond within 12 hours, the
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
          {(booking.status === "PENDING" ||
            booking.status === "PAYMENT_PENDING") && (
            <BookingActions bookingId={booking.id} />
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
            <div className="flex items-center gap-3 mb-6">
              <div
                className={`rounded-xl p-2.5 ${
                  booking.status === "PENDING"
                    ? "bg-amber-50"
                    : booking.status === "APPROVED" || booking.status === "PAID"
                      ? "bg-green-50"
                      : "bg-red-50"
                }`}
              >
                <StatusIcon
                  className={`h-5 w-5 ${
                    booking.status === "PENDING"
                      ? "text-amber-600"
                      : booking.status === "APPROVED" ||
                          booking.status === "PAID"
                        ? "text-green-600"
                        : "text-red-600"
                  }`}
                />
              </div>
              <div>
                <p className="font-medium text-slate-900">{booking.status}</p>
                <p className="text-sm text-slate-600">
                  {booking.status === "PENDING" && "Awaiting your response"}
                  {booking.status === "APPROVED" && "Awaiting payment"}
                  {booking.status === "PAID" && "Confirmed"}
                  {booking.status === "REJECTED" && "Booking declined"}
                  {booking.status === "CANCELLED" && "Cancelled by customer"}
                </p>
              </div>
            </div>

            <BookingTimeline
              status={booking.status}
              createdAt={booking.createdAt}
              updatedAt={booking.updatedAt}
              tripDate={new Date(booking.date)}
              rejectionReason={booking.rejectionReason}
              cancellationReason={booking.cancellationReason}
            />
          </div>

          {/* Trip Details */}
          <div className="p-6 bg-white border rounded-2xl border-slate-200">
            <h2 className="mb-4 text-base font-semibold text-slate-900">
              Trip Details
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Ship className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Trip Type
                  </p>
                  <p className="text-sm text-slate-900">{booking.tripName}</p>
                </div>
              </div>

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
                  </p>
                  <p className="text-sm text-slate-900"></p>
                  {booking.days && (
                    <p className="text-sm text-slate-600">
                      {booking.days} day{booking.days !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>

              {booking.durationHour && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Duration
                    </p>
                    <p className="text-sm text-slate-900">
                      <span>
                        {booking.durationHour} hour
                        {booking.durationHour !== 1 ? "s" : ""}
                      </span>
                      {booking.startTime && (
                        <span>
                          {" "}
                          · Starting at {convert24to12Hour(booking.startTime)}
                        </span>
                      )}
                    </p>
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
                      `, ${booking.children} child${
                        booking.children !== 1 ? "ren" : ""
                      }`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Location</p>
                  <p className="text-sm text-slate-900">{booking.location}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Note */}
          {booking.note && (
            <div className="p-6 border border-blue-200 rounded-2xl bg-blue-50">
              <h2 className="mb-2 text-base font-semibold text-blue-900">
                Customer Note
              </h2>
              <p className="text-sm text-blue-800">{booking.note}</p>
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
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">
                  RM {booking.unitPrice.toLocaleString()} × {booking.days} day
                  {booking.days !== 1 ? "s" : ""}
                </span>
                <span className="text-slate-900">
                  RM {booking.totalPrice.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Commission (10%)</span>
                <span className="text-slate-900">
                  - RM {fishonCommission.toLocaleString()}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">
                    Total
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-bold text-slate-900">
                      RM {yourEarning.toLocaleString()}
                    </span>
                  </div>
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
                  {!isGuest && (
                    <div className="p-3 text-xs rounded-lg bg-slate-50 text-slate-600">
                      <Phone className="h-3.5 w-3.5 inline mr-1" />
                      Contact details available after payment
                    </div>
                  )}
                </>
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
                  {new Date(booking.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {booking.captainDecisionAt && (
                <div>
                  <p className="font-medium text-slate-700">
                    {booking.status === "APPROVED" ? "Approved" : "Responded"}
                  </p>
                  <p className="text-slate-600">
                    {new Date(booking.captainDecisionAt).toLocaleString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              )}
              {booking.status === "PENDING" && (
                <div>
                  <p className="font-medium text-slate-700">Expires </p>
                  <p className="text-slate-600">
                    {new Date(booking.expiresAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
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
