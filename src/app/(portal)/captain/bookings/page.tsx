import { BookingPageRefresher } from "@/components/BookingPageRefresher";
import { BookingCalendar } from "@/components/captain/BookingCalendar";
import { BookingStatsCards } from "@/components/captain/BookingStatsCards";
import { BookingTabs } from "@/components/captain/BookingTabs";
import { PriorityBookings } from "@/components/captain/PriorityBookings";
import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { getPriorityBookings } from "@/lib/booking-priority";
import { getCaptainBookings } from "@/lib/booking-service";
import { prisma } from "@/lib/prisma";
import { Calendar } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CaptainBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId = resolvedSearchParams?.adminUserId;

  if (!session?.user?.id) {
    redirect("/auth?mode=signin");
  }

  // Use effective user ID for admin bypass
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });

  if (!effectiveUserId) {
    redirect("/auth?mode=signin");
  }

  // Ensure captain profile exists
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: effectiveUserId },
    select: { id: true },
  });

  if (!captain) {
    // If admin is viewing and captain doesn't exist, show helpful message
    if (adminUserId) {
      return (
        <div className="px-6 py-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Bookings
          </h1>
          <p className="mt-4 text-slate-600">
            This user does not have a captain profile.
          </p>
        </div>
      );
    }
    redirect("/captain/form");
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
        <div className="p-8 mt-6 text-center bg-white border rounded-2xl border-slate-200">
          <Calendar className="w-12 h-12 mx-auto text-slate-400" />
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

  const bookings = await getCaptainBookings(charterIds);

  // Fetch angler info for authenticated bookings
  const userIds = Array.from(
    new Set(bookings.filter((b) => b.userId).map((b) => b.userId!))
  );
  const { prismaMarket } = await import("@/lib/prisma-market");
  const anglers: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[] =
    userIds.length > 0
      ? await prismaMarket.marketUser.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, image: true },
        })
      : [];
  const anglerMap = Object.fromEntries(anglers.map((a) => [a.id, a]));

  // Get priority bookings
  const priorityBookings = getPriorityBookings(bookings);

  return (
    <div className="px-4 py-8 mx-auto space-y-8 sm:px-6">
      <BookingPageRefresher />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your charter bookings and customer requests
          </p>
        </div>
      </div>

      {/* Priority Section */}
      {priorityBookings.length > 0 && (
        <PriorityBookings
          priorityBookings={priorityBookings}
          anglerMap={anglerMap}
        />
      )}

      {/* Stats Cards */}
      <BookingStatsCards bookings={bookings} />

      {/* Booking Calendar */}
      <BookingCalendar bookings={bookings} anglerMap={anglerMap} />

      {/* Tabs Section */}
      <BookingTabs bookings={bookings} anglerMap={anglerMap} />
    </div>
  );
}
