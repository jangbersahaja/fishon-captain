import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Ship } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NotificationItem } from "@/components/NotificationCenter";
interface ProfileWithCharter {
  id: string;
  displayName: string;
  charters: {
    id: string;
    name: string;
    updatedAt: Date;
    city: string;
    state: string;
    media: { kind: string }[];
    trips: { durationHours: number; price: unknown }[];
  }[];
}
async function getCharter(adminUserId?: string) {
  const session = await getServerSession(authOptions);
  if (!(session?.user as { id?: string } | undefined)?.id)
    redirect("/auth?mode=signin");
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  const profile = await prisma.captainProfile.findUnique({
    where: { userId: effectiveUserId },
    select: {
      id: true,
      displayName: true,
      charters: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          updatedAt: true,
          city: true,
          state: true,
          media: true,
          trips: true,
        },
      },
    },
  });
  const typed = profile as ProfileWithCharter | null;
  if (!typed || !typed.charters || !typed.charters.length) {
    redirect("/auth?next=/captain/form");
  }
  const charters = typed.charters;
  // Calculate total media across all charters
  const photoCount = charters.reduce((sum, c) => sum + c.media.length, 0);
  const videoCount = profile
    ? await prisma.captainVideo.count({
        where: { captainId: profile.id },
      })
    : 0;
  return {
    profile: typed,
    charters,
    userId: effectiveUserId,
    photoCount,
    videoCount,
  };
}

interface DocStatusShape {
  status?: string;
  [k: string]: unknown;
}
interface VerificationRow {
  idFront?: DocStatusShape | null;
  idBack?: DocStatusShape | null;
  captainLicense?: DocStatusShape | null;
  boatRegistration?: DocStatusShape | null;
  fishingLicense?: DocStatusShape | null;
  additional?: unknown;
}
async function getVerification(
  userId: string
): Promise<VerificationRow | null> {
  const row = await prisma.captainVerification.findUnique({
    where: { userId },
  });
  return row as VerificationRow | null;
}

export default async function CaptainDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ [k: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminUserId = resolvedSearchParams?.adminUserId;

  // Allow ADMIN to access any user's dashboard with adminUserId parameter
  if (role === "ADMIN" && adminUserId) {
    // Admin is accessing another user's dashboard - validate the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true },
    });
    if (!targetUser) {
      redirect("/staff");
    }
  } else if ((role === "STAFF" || role === "ADMIN") && !adminUserId) {
    // Regular staff/admin without adminUserId go to staff dashboard
    redirect("/staff");
  }

  const { profile, charters, userId } = await getCharter(adminUserId);
  const verification = await getVerification(userId);

  // Get user's role for upgrade banner
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  const userRole = user?.role;

  // Get target user info for admin banner
  let targetUserInfo = null;
  if (adminUserId && role === "ADMIN") {
    targetUserInfo = await prisma.user.findUnique({
      where: { id: adminUserId },
      select: { id: true, email: true, name: true, role: true },
    });
  }
  const govFront = !!verification?.idFront;
  const govBack = !!verification?.idBack;
  function badgeStatus(doc: unknown): NotificationItem["status"] {
    if (!doc) return "missing";
    if (
      typeof doc === "object" &&
      doc &&
      (doc as DocStatusShape).status === "validated"
    )
      return "validated";
    if (
      typeof doc === "object" &&
      doc &&
      (doc as DocStatusShape).status === "processing"
    )
      return "processing";
    return "processing";
  }
  // Only government ID is required; other documents are optional and shown separately.
  const requiredItems: NotificationItem[] = [
    {
      id: "govId",
      label: "Government ID (front & back)",
      status:
        govFront && govBack
          ? badgeStatus(verification?.idFront) === "validated" &&
            badgeStatus(verification?.idBack) === "validated"
            ? "validated"
            : badgeStatus(verification?.idFront) === "processing" ||
                badgeStatus(verification?.idBack) === "processing"
              ? "processing"
              : "processing"
          : govFront || govBack
            ? "partial"
            : "missing",
      detail:
        !govFront && !govBack
          ? "Both sides required"
          : govFront && !govBack
            ? "Back side missing"
            : !govFront && govBack
              ? "Front side missing"
              : undefined,
      href: "/captain/verification",
    },
  ];

  // Optional documents (do not affect offline state)
  const optionalItems: NotificationItem[] = [
    {
      id: "captainLicense",
      label: "Captain license",
      status: badgeStatus(verification?.captainLicense),
      href: "/captain/verification",
    },
    {
      id: "boatRegistration",
      label: "Boat registration certificate",
      status: badgeStatus(verification?.boatRegistration),
      href: "/captain/verification",
    },
    {
      id: "fishingLicense",
      label: "Fishing license",
      status: badgeStatus(verification?.fishingLicense),
      href: "/captain/verification",
    },
  ];

  // Grouped status summary for consolidated offline banner
  const missingDocs = requiredItems.filter(
    (i) => i.status === "missing" || i.status === "partial"
  );
  const processingDocs = requiredItems.filter((i) => i.status === "processing");
  const anyActionable = missingDocs.length > 0 || processingDocs.length > 0;
  // Only gov ID influences offline state now
  const charterOffline = anyActionable;

  function renderOfflineBanner() {
    if (!charterOffline) return null;
    const missingList = missingDocs.map((d) => d.label).join(", ");
    const processingList = processingDocs.map((d) => d.label).join(", ");
    return (
      <div className="p-4 mt-2 mb-4 text-sm text-red-800 border border-red-200 rounded-2xl bg-red-50">
        <p className="font-semibold text-red-900">
          Your charter is currently offline.
        </p>
        <div className="mt-1 space-y-1">
          <p className="leading-snug">
            Verification incomplete. Please provide the required documents
            below.
          </p>
          {missingList && (
            <p className="leading-snug">
              <span className="font-medium">Missing:</span> {missingList}
            </p>
          )}
          {processingList && (
            <p className="leading-snug">
              <span className="font-medium">Processing:</span> {processingList}
            </p>
          )}
        </div>
        <div className="mt-3">
          <Link
            href="/captain/verification"
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800"
            prefetch={false}
          >
            Manage documents
          </Link>
        </div>
      </div>
    );
  }

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
                Viewing dashboard for:{" "}
                {targetUserInfo.name || targetUserInfo.email} (
                {targetUserInfo.id})
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
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {targetUserInfo
              ? `Dashboard - ${targetUserInfo.name || targetUserInfo.email}`
              : `Welcome back, ${profile.displayName}`}
          </h1>
          <p className="text-sm text-slate-500">
            {targetUserInfo
              ? "Admin view of user's charter and documents"
              : "Manage your charter and documents here."}
          </p>
        </div>

        {/* Multiple Charters Support */}
        {charters.length > 1 && (
          <div className="p-4 bg-white border shadow-sm rounded-2xl border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Your Charters ({charters.length})
              </h3>
              <Link
                href="/captain/form"
                className="inline-flex items-center gap-1 rounded-full bg-[#ec2227] px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-[#d81e23]"
              >
                <Ship className="w-3 h-3" /> Add Charter
              </Link>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {charters.map((c, idx) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-3 ${
                    idx === 0
                      ? "border-[#ec2227] bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-900">
                        {c.name}
                      </p>
                      <p className="text-xs truncate text-slate-500">
                        {c.city}, {c.state}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {c.trips.length} trips · {c.media.length} media
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="text-[10px] font-semibold text-[#ec2227] uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/captain/form?editCharterId=${c.id}${
                      adminUserId ? `&adminUserId=${adminUserId}` : ""
                    }`}
                    className="mt-2 inline-flex text-xs font-medium text-slate-600 hover:text-[#ec2227]"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upgrade to Operator Banner */}
        {userRole === "CAPTAIN" && charters.length === 1 && (
          <div className="hidden p-5 border-2 border-blue-200 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-slate-900">
                  🚀 Upgrade to Operator
                </h3>
                <p className="mb-2 text-sm text-slate-600">
                  Manage multiple charters, add crew members, and scale your
                  fishing business.
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  <li>✓ Unlimited charter listings</li>
                  <li>✓ Crew management system</li>
                  <li>✓ Advanced analytics & reporting</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
              <div className="sm:text-right">
                <Link
                  href="/captain/upgrade"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700"
                >
                  Upgrade Now
                </Link>
                <p className="mt-2 text-xs text-slate-500">
                  Contact support for details
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {renderOfflineBanner()}
          {/* Optional documents section */}
          <div className="">
            <div className="mb-1 text-xs font-semibold text-slate-500">
              Other documents
            </div>
            <div className="space-y-2">
              {optionalItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    item.status === "validated"
                      ? "border-slate-200 bg-white text-slate-400"
                      : item.status === "processing"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 mr-2 rounded-full"
                    style={{
                      backgroundColor:
                        item.status === "validated"
                          ? "#22c55e"
                          : item.status === "processing"
                            ? "#fbbf24"
                            : "#cbd5e1",
                    }}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.status === "validated" && (
                    <span className="ml-2 text-xs font-medium text-green-500">
                      Validated
                    </span>
                  )}
                  {item.status === "processing" && (
                    <span className="ml-2 text-xs font-medium text-amber-600">
                      Processing
                    </span>
                  )}
                  {(item.status === "missing" || item.status === "partial") && (
                    <span className="ml-2 text-xs text-slate-400">
                      Not uploaded
                    </span>
                  )}
                  <Link
                    href={item.href!}
                    className="ml-3 inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
                  >
                    Manage
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-5 mt-20 text-gray-500 bg-gray-100 border-2 border-gray-200 border-dashed rounded-2xl h-100">
        <span className="">Captain Dashboard</span>
      </div>
    </div>
  );
}
