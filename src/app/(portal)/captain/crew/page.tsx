import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { CrewList } from "./CrewList";

async function getCrewMembers(adminUserId?: string) {
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
      crewAssignments: {
        where: { isActive: true },
        include: {
          crew: true,
        },
      },
    },
  });

  // Get all unique crew members from all charters
  const crewMap = new Map();
  charters.forEach((charter) => {
    charter.crewAssignments.forEach((assignment) => {
      if (!crewMap.has(assignment.crew.id)) {
        crewMap.set(assignment.crew.id, {
          ...assignment.crew,
          charters: [],
        });
      }
      crewMap.get(assignment.crew.id).charters.push({
        charterId: charter.id,
        charterName: charter.name,
        role: assignment.role,
        assignmentId: assignment.id,
      });
    });
  });

  const crewMembers = Array.from(crewMap.values());

  return { crewMembers, charters, effectiveUserId };
}

export default async function CrewPage({
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

  const { crewMembers, charters } = await getCrewMembers(adminUserId);

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
                Viewing crew for: {targetUserInfo.name || targetUserInfo.email}{" "}
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
          Crew Management
        </h1>
        <p className="text-sm text-slate-500">
          Manage your crew members and assign them to charters
        </p>
      </div>

      <CrewList
        crewMembers={crewMembers}
        charters={charters}
        adminUserId={adminUserId}
      />
    </div>
  );
}
