import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { BoatList } from "./BoatList";

async function getBoats(adminUserId?: string) {
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
      boatId: true,
      boat: {
        select: {
          id: true,
          name: true,
          type: true,
          lengthFt: true,
          capacity: true,
          imageUrl: true,
          features: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // Get all unique boats used by this user's charters
  const boatMap = new Map();
  charters.forEach((charter) => {
    if (charter.boat && !boatMap.has(charter.boat.id)) {
      boatMap.set(charter.boat.id, {
        ...charter.boat,
        createdAt: charter.boat.createdAt.toISOString(),
        updatedAt: charter.boat.updatedAt.toISOString(),
        charters: [],
      });
    }
    if (charter.boat) {
      boatMap.get(charter.boat.id).charters.push({
        charterId: charter.id,
        charterName: charter.name,
      });
    }
  });

  const boats = Array.from(boatMap.values());

  // Serialize charters for client
  const serializedCharters = charters.map((charter) => ({
    id: charter.id,
    name: charter.name,
    boatId: charter.boatId,
  }));

  return { boats, charters: serializedCharters };
}

export default async function BoatsPage({
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

  const { boats, charters } = await getBoats(adminUserId);

  return (
    <div className="px-6 py-8 space-y-8">
      {targetUserInfo && (
        <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-orange-800">
                🛡️ Admin Override Active
              </h2>
              <p className="text-xs text-orange-700">
                Viewing boats for: {targetUserInfo.name || targetUserInfo.email}{" "}
                ({targetUserInfo.id})
              </p>
            </div>
            <a
              href="/staff"
              className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Exit Admin Mode
            </a>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Boat Management
        </h1>
        <p className="text-sm text-slate-500">
          Manage your fleet of fishing vessels
        </p>
      </div>

      <BoatList boats={boats} charters={charters} adminUserId={adminUserId} />
    </div>
  );
}
