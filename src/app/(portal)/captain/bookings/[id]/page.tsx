import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  Ship,
  Users,
} from "lucide-react";
import { getServerSession } from "next-auth";
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

  // Fetch booking from market DB
  const { prismaMarket } = await import("@/lib/prisma-market");
  const booking = await prismaMarket.booking.findUnique({
    where: { id },
  });

  if (!booking) {
    notFound();
  }

  // Verify this booking belongs to one of captain's charters
  if (!charterIds.includes(booking.captainCharterId)) {
    notFound();
  }

  // Fetch angler info
  const angler = await prismaMarket.marketUser.findUnique({
    where: { id: booking.userId },
    select: { id: true, displayName: true, email: true },
  });

  const StatusIcon = getStatusIcon(booking.status);

  return (
    <div className="px-6 py-8 space-y-6">
      {/* Back Link */}
      <Link
        href="/captain/bookings"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        prefetch={false}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {booking.charterName}
            </h1>
            <Badge variant={getStatusColor(booking.status)}>
              {booking.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Booking ID: {booking.id}
          </p>
        </div>
        {booking.status === "PENDING" && (
          <BookingActions bookingId={booking.id} />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Booking Status
            </h2>
            <div className="flex items-center gap-3">
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
            {booking.status === "PENDING" && (
              <p className="mt-4 text-sm text-slate-600">
                Expires:{" "}
                {new Date(booking.expiresAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          {/* Trip Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
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
                    {new Date(booking.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  {booking.startTime && (
                    <p className="text-sm text-slate-600">
                      Start time: {booking.startTime}
                    </p>
                  )}
                </div>
              </div>

              {booking.days > 1 && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Duration
                    </p>
                    <p className="text-sm text-slate-900">
                      {booking.days} day{booking.days !== 1 ? "s" : ""}
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
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
              <h2 className="text-base font-semibold text-blue-900 mb-2">
                Customer Note
              </h2>
              <p className="text-sm text-blue-800">{booking.note}</p>
            </div>
          )}

          {/* Rejection Reason */}
          {booking.status === "REJECTED" && booking.rejectionReason && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
              <h2 className="text-base font-semibold text-red-900 mb-2">
                Rejection Reason
              </h2>
              <p className="text-sm text-red-800">{booking.rejectionReason}</p>
            </div>
          )}

          {/* Cancellation Reason */}
          {booking.status === "CANCELLED" && booking.cancellationReason && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-6">
              <h2 className="text-base font-semibold text-orange-900 mb-2">
                Cancellation Reason
              </h2>
              <p className="text-sm text-orange-800">
                {booking.cancellationReason}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Pricing & Customer Info */}
        <div className="space-y-6">
          {/* Pricing Breakdown */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Pricing
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
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">
                    Total
                  </span>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                    <span className="text-xl font-bold text-slate-900">
                      RM {booking.totalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
              Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700">Name</p>
                <p className="text-sm text-slate-900">
                  {angler?.displayName || "Not available"}
                </p>
              </div>
              {booking.status === "PAID" && angler?.email && (
                <>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-slate-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Email
                      </p>
                      <a
                        href={`mailto:${angler.email}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {angler.email}
                      </a>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 inline mr-1" />
                    Contact details available after payment
                  </div>
                </>
              )}
              {booking.status !== "PAID" && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  Full contact details will be available after payment is
                  confirmed
                </div>
              )}
            </div>
          </div>

          {/* Booking Timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
