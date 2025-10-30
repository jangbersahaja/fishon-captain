/**
 * Captain Calendar Page
 *
 * Full calendar view showing:
 * - All bookings (all statuses)
 * - Operational schedule
 * - Unavailable dates
 * - Schedule and unavailability management
 */

import { CalendarLegend } from "@/components/captain/calendar/CalendarLegend";
import { CharterCalendar } from "@/components/captain/calendar/CharterCalendar";
import { ScheduleSection } from "@/components/captain/calendar/ScheduleSection";
import { UnavailabilitySection } from "@/components/captain/calendar/UnavailabilitySection";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { getCaptainBookings } from "@/lib/booking-service";
import { prisma } from "@/lib/prisma";
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
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
          schedule: true,
          unavailability: {
            where: {
              endDate: {
                gte: new Date(new Date().getFullYear(), 0, 1), // This year onwards
              },
            },
            orderBy: { startDate: "asc" },
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

  // Use first charter (or allow charter selection in future)
  const selectedCharter = captain.charters[0];

  // Fetch bookings for the charter
  const bookings = await getCaptainBookings([selectedCharter.id]);

  // Fetch angler info for authenticated bookings (same as /bookings page)
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

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/captain/bookings">
            <Button variant="ghost" size="sm" className="mb-2">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Bookings
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Charter Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage your availability and view all bookings
          </p>
        </div>
      </div>
      {/* Charter Selector (if multiple charters) */}
      {captain.charters.length > 1 && (
        <div className="p-4 mb-6 bg-white border rounded-lg border-slate-200">
          <label
            htmlFor="charter-select"
            className="block mb-2 text-sm font-medium text-slate-700"
          >
            Charter
          </label>
          <select
            id="charter-select"
            className="w-full max-w-xs px-3 py-2 text-sm border rounded-md border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            defaultValue={selectedCharter.id}
          >
            {captain.charters.map((charter) => (
              <option key={charter.id} value={charter.id}>
                {charter.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* Legend - moved below calendar */}
      <div className="mb-6">
        <CalendarLegend />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar Area */}

        {/* Calendar */}
        <CharterCalendar
          charterId={selectedCharter.id}
          charterName={selectedCharter.name}
          bookings={bookings}
          anglerMap={anglerMap}
          unavailability={selectedCharter.unavailability}
        />

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Schedule Section */}
          <ScheduleSection
            charterId={selectedCharter.id}
            schedule={selectedCharter.schedule}
          />

          {/* Unavailability Section */}
          <UnavailabilitySection
            charterId={selectedCharter.id}
            unavailability={selectedCharter.unavailability}
          />
        </div>
      </div>
    </div>
  );
}
