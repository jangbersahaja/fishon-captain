import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CharterList } from "./CharterList";

export const dynamic = "force-dynamic";

export default async function ChartersListPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const resolvedParams = searchParams ? await searchParams : {};
  const adminUserId =
    typeof resolvedParams?.adminUserId === "string"
      ? resolvedParams.adminUserId
      : undefined;

  let targetUserInfo: {
    id: string;
    email: string | null;
    name: string | null;
  } | null = null;
  const role = (session?.user?.role as string | undefined) || "CAPTAIN";

  if (role === "ADMIN" && adminUserId) {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true },
    });
    if (!targetUserInfo) {
      redirect("/staff");
    }
  } else if ((role === "STAFF" || role === "ADMIN") && !adminUserId) {
    redirect("/staff");
  }

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  // Fetch user's charters
  const charters = await prisma.charter.findMany({
    where: { ownerId: effectiveUserId },
    select: {
      id: true,
      name: true,
      charterType: true,
      city: true,
      state: true,
      startingPoint: true,
      isActive: true,
      _count: {
        select: {
          trips: true,
          media: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

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
                Viewing charters for:{" "}
                {targetUserInfo.name || targetUserInfo.email} (
                {targetUserInfo.id})
              </p>
            </div>
            <Link
              href="/staff"
              className="rounded-full bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700"
            >
              Exit Admin Mode
            </Link>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Charter Management
          </h1>
          <p className="text-sm text-slate-500">
            Manage your charter listings and core details. Trips, boats, media,
            and profile have dedicated management pages.
          </p>
        </div>
      </div>

      <CharterList
        charters={charters}
        userRole={role as "CAPTAIN" | "OPERATOR" | "CREW" | "STAFF" | "ADMIN"}
        adminUserId={adminUserId}
      />
    </div>
  );
}
