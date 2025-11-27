import { CalendarShell } from "@/components/captain/calendar/CalendarShell";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { getCaptainBookings } from "@/lib/booking-service";
import { EnrichedMarketBooking } from "@/lib/enrich-booking";
import { prisma } from "@/lib/prisma";
import { differenceInHours } from "date-fns";
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get captain profile
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      charters: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          schedule: {
            select: {
              scheduleType: true,
              operationalDays: true,
            },
          },
          unavailability: {
            where: {
              endDate: {
                gte: new Date(new Date().getFullYear(), 0, 1), // This year onwards
              },
            },
            orderBy: { startDate: "asc" },
            include: { trip: true },
          },
          trips: {
            select: {
              id: true,
              name: true,
              durationHours: true,
            },
          },
        },
      },
    },
  });

  if (!captain) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Calendar
        </h1>
        <p className="mt-4 text-slate-600">Captain profile not found.</p>
      </div>
    );
  }

  if (captain.charters.length === 0) {
    return (
      <div className="px-6 py-8">
        <div className="mb-6">
          <Link href="/captain/bookings">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Calendar
        </h1>
        <p className="mt-4 text-slate-600">
          You do not have any active charters. Create a charter to manage your
          availability.
        </p>
      </div>
    );
  }

  const params = await searchParams;
  // Determine selected charter from URL or default to first
  const charterId = (params.charterId as string) || captain.charters[0].id;
  const selectedCharter =
    captain.charters.find((c) => c.id === charterId) || captain.charters[0];

  // Fetch bookings for the charter
  const bookings = await getCaptainBookings([selectedCharter.id]);

  // Map unavailability to booking-like objects
  const blockedBookings: EnrichedMarketBooking[] =
    selectedCharter.unavailability.map((u) => ({
      id: u.id,
      userId: "blocked", // Placeholder
      charterId: u.charterId,
      tripId: "blocked",
      originalTripId: u.tripId,
      guests: { adults: 0, children: 0 },
      tripPrice: 0,
      startTime: u.startDate.toISOString(),
      date: u.startDate,
      days: Math.ceil(differenceInHours(u.endDate, u.startDate) / 24) || 1,
      finalPrice: 0,
      status: "CANCELLED", // Use CANCELLED to get gray color
      expiresAt: u.endDate,
      captainDecisionAt: null,
      note: u.reason,
      rejectionReason: null,
      cancellationReason: null,
      captainResponse: null,
      reviewNotes: null,
      timeSlots: [
        {
          day: 1,
          date: u.startDate.toISOString(),
          startDateTime: u.startDate.toISOString(),
          endDateTime: u.endDate.toISOString(),
        },
      ],
      paymentTransactionId: null,
      paymentMethod: null,
      paymentFlow: null,
      paymentNote: null,
      paymentIntentId: null,
      paymentAuthorizedAt: null,
      paymentCapturedAt: null,
      paymentReleasedAt: null,
      bookingFlowType: "MANUAL",
      platformFee: null,
      serviceFee: null,
      captainEarnings: null,
      refundStatus: null,
      refundAmount: null,
      refundedAt: null,
      refundReason: null,
      chatId: null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,

      // Enriched fields
      charterName: selectedCharter.name,
      tripName:
        (typeof u.trip === "object" && u.trip !== null && "name" in u.trip
          ? (u.trip as { name?: string }).name
          : undefined) ||
        u.reason ||
        (u.tripId ? "Specific Trip Unavailable" : "Unavailable"),
      adults: 0,
      children: 0,
      unitPrice: 0,
      totalPrice: 0,
      location: "",
      durationHour: differenceInHours(u.endDate, u.startDate),
      conversationId: null,
      conversationStatus: null,
      allParticipants: [],
    }));

  const allBookings = [...bookings, ...blockedBookings];

  // Fetch angler info for authenticated bookings
  const userIds = Array.from(
    new Set(bookings.filter((b) => b.userId).map((b) => b.userId!))
  );

  interface AnglerInfo {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }

  let anglerMap: Record<string, AnglerInfo> = {};

  if (userIds.length > 0) {
    const { prismaMarket } = await import("@/lib/prisma-market");
    const anglers = await prismaMarket.marketUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true },
    });
    anglerMap = Object.fromEntries(anglers.map((a: AnglerInfo) => [a.id, a]));
  }

  return (
    <CalendarShell
      charters={captain.charters.map((c) => ({
        id: c.id,
        name: c.name,
        schedule: c.schedule,
        trips: c.trips,
      }))}
      bookings={allBookings}
      anglerMap={anglerMap}
    />
  );
}
