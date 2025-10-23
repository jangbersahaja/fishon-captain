import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";
import { getBookingStats, getCaptainBookings } from "@/lib/booking-service";
import { prisma } from "@/lib/prisma";
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  XCircle,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { BookingActions } from "./BookingActions";

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

export default async function CaptainBookingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bookings
        </h1>
        <p className="mt-4 text-slate-600">
          You must be signed in to view bookings.
        </p>
      </div>
    );
  }

  // Ensure captain profile exists
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!captain) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bookings
        </h1>
        <p className="mt-4 text-slate-600">Captain profile not found.</p>
      </div>
    );
  }

  // Captain's active charters
  const charters = await prisma.charter.findMany({
    where: { captainId: captain.id, isActive: true },
    select: { id: true, name: true },
  });
  const charterIds = charters.map((c) => c.id);

  if (charterIds.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bookings
        </h1>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-slate-400" />
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No Active Charters
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            You don&apos;t have any active charters yet.
          </p>
        </div>
      </div>
    );
  }

  const [bookings, stats] = await Promise.all([
    getCaptainBookings(charterIds),
    getBookingStats(charterIds),
  ]);

  // Fetch angler info for each booking (user displayName, email)
  const userIds = Array.from(new Set(bookings.map((b) => b.userId)));
  const { prismaMarket } = await import("@/lib/prisma-market");
  const anglers: { id: string; displayName: string | null; email: string }[] =
    await prismaMarket.marketUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, displayName: true, email: true },
    });
  const anglerMap = Object.fromEntries(anglers.map((a) => [a.id, a]));

  return (
    <div className="px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Bookings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your charter bookings and customer requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Pending</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.PENDING}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Approved</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.APPROVED}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-50 p-2.5">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Paid</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.PAID}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-50 p-2.5">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Rejected</p>
              <p className="text-2xl font-semibold text-slate-900">
                {stats.REJECTED}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Bookings
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {bookings.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Calendar className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm text-slate-600">
                No bookings yet. They&apos;ll appear here when customers book
                your charters.
              </p>
            </div>
          ) : (
            bookings.map((b) => {
              const angler = anglerMap[b.userId];
              return (
                <div
                  key={b.id}
                  className="px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">
                          {b.charterName}
                        </h3>
                        <span className="text-slate-400">•</span>
                        <span className="text-sm text-slate-600">
                          {b.tripName}
                        </span>
                        <Badge variant={getStatusColor(b.status)}>
                          {b.status}
                        </Badge>
                      </div>

                      {/* Booking Details */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(b.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          <span>
                            {b.adults} adult{b.adults !== 1 ? "s" : ""}
                            {b.children > 0 &&
                              `, ${b.children} child${
                                b.children !== 1 ? "ren" : ""
                              }`}
                          </span>
                        </div>
                        {b.days > 1 && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>
                              {b.days} day{b.days !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Angler Info */}
                      <div className="text-sm">
                        <span className="font-medium text-slate-700">
                          Angler:
                        </span>{" "}
                        <span className="text-slate-600">
                          {angler?.displayName || "Not available"}
                        </span>
                      </div>

                      {/* Note */}
                      {b.note && (
                        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm">
                          <span className="font-medium text-blue-900">
                            Note:
                          </span>{" "}
                          <span className="text-blue-800">{b.note}</span>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {b.status === "REJECTED" && b.rejectionReason && (
                        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm">
                          <span className="font-medium text-red-900">
                            Rejection reason:
                          </span>{" "}
                          <span className="text-red-800">
                            {b.rejectionReason}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-3 min-w-[140px]">
                      <div className="text-right">
                        <div className="text-xl font-semibold text-slate-900">
                          RM {b.totalPrice.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/captain/bookings/${b.id}`}
                          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800 transition-colors"
                          prefetch={false}
                        >
                          View Details
                        </Link>
                        {b.status === "PENDING" && (
                          <BookingActions bookingId={b.id} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
