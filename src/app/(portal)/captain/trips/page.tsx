import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { TripList } from "./TripList";

async function getTrips(adminUserId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  // Get captain profile to verify they exist
  const profile = await prisma.captainProfile.findUnique({
    where: { userId: effectiveUserId },
    select: { id: true },
  });

  if (!profile) {
    redirect("/captain/form");
  }

  // Get all charters owned by this user
  const charters = await prisma.charter.findMany({
    where: { ownerId: effectiveUserId },
    select: {
      id: true,
      name: true,
      trips: {
        include: {
          species: true,
          startTimes: true,
          techniques: true,
        },
      },
    },
  });

  // Flatten trips with charter info and serialize for client
  // Convert Decimal to number via string to ensure proper serialization
  const trips: Array<{
    id: string;
    charterId: string;
    name: string;
    tripType: string;
    price: number;
    promoPrice: number | null;
    durationHours: number;
    maxAnglers: number;
    style: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
    species: Array<{ id: string; value: string }>;
    startTimes: Array<{ id: string; value: string }>;
    techniques: Array<{ id: string; value: string }>;
    charter: { id: string; name: string };
  }> = charters.flatMap((charter) =>
    charter.trips.map((trip) => ({
      id: trip.id,
      charterId: trip.charterId,
      name: trip.name,
      tripType: trip.tripType,
      price: parseFloat(trip.price.toString()),
      promoPrice: trip.promoPrice
        ? parseFloat(trip.promoPrice.toString())
        : null,
      durationHours: trip.durationHours,
      maxAnglers: trip.maxAnglers,
      style: trip.style,
      description: trip.description,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      species: trip.species.map((s) => ({
        id: s.id,
        value: s.value,
      })),
      startTimes: trip.startTimes.map((st) => ({
        id: st.id,
        value: st.value,
      })),
      techniques: trip.techniques.map((t) => ({
        id: t.id,
        value: t.value,
      })),
      charter: {
        id: charter.id,
        name: charter.name,
      },
    }))
  );

  // Serialize charters (only id and name needed for client)
  const serializedCharters = charters.map((charter) => ({
    id: charter.id,
    name: charter.name,
  }));

  return { trips, charters: serializedCharters };
}

export default async function TripsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId = resolvedSearchParams?.adminUserId;

  // Admin override banner
  let targetUserInfo = null;
  if (adminUserId && role === "ADMIN") {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true },
    });
  }

  const { trips, charters } = await getTrips(adminUserId);

  return (
    <div className="px-6 py-8 space-y-8">
      {targetUserInfo && (
        <div className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-orange-800">
                🛡️ Admin Override Active
              </h2>
              <p className="text-xs text-orange-700">
                Viewing trips for: {targetUserInfo.name || targetUserInfo.email}{" "}
                ({targetUserInfo.id})
              </p>
            </div>
            <a
              href="/staff"
              className="px-3 py-1 text-xs font-semibold text-white bg-orange-600 rounded-full hover:bg-orange-700"
            >
              Exit Admin Mode
            </a>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Trip Management
        </h1>
        <p className="text-sm text-slate-500">
          Manage trip packages for your charters
        </p>
      </div>

      <TripList trips={trips} charters={charters} adminUserId={adminUserId} />
    </div>
  );
}
