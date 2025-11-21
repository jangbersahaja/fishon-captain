import { DashboardMetricsGrid } from "@/components/captain/DashboardMetricsGrid";
import { QuickLinksSection } from "@/components/captain/QuickLinksSection";
import { SystemMessagesAlert } from "@/components/captain/SystemMessagesAlert";
import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard-service";
import { prisma } from "@/lib/prisma";
import { Ship } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  // Fetch dashboard data for Phase 3
  const dashboardData = await getDashboardData(effectiveUserId);

  return {
    profile: typed,
    charters,
    userId: effectiveUserId,
    photoCount,
    videoCount,
    dashboardData,
  };
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

  const { profile, charters, userId, dashboardData } =
    await getCharter(adminUserId);

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

  return (
    <div className="min-h-screen px-6 py-8 space-y-8 bg-slate-50">
      {targetUserInfo && (
        <div
          className="p-4 border border-orange-200 shadow-sm rounded-2xl bg-orange-50"
          role="status"
          aria-live="polite"
        >
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
              className="px-3 py-1 text-xs font-semibold text-white transition-colors duration-200 bg-orange-600 rounded-full hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600"
            >
              Exit Admin Mode
            </a>
          </div>
        </div>
      )}

      {/* Phase 3: System Messages Alert */}
      {dashboardData.systemMessages?.length > 0 && (
        <SystemMessagesAlert messages={dashboardData.systemMessages} />
      )}

      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {targetUserInfo
              ? `Dashboard - ${targetUserInfo.name || targetUserInfo.email}`
              : `Welcome back, ${profile.displayName}`}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {targetUserInfo
              ? "Admin view of user's charter and documents"
              : "Manage your charter and documents here."}
          </p>
        </div>

        {/* Phase 3: Dashboard Metrics Grid */}
        <DashboardMetricsGrid
          bookingStats={dashboardData.bookingStats}
          earningsData={dashboardData.earningsData}
          analyticsData={{
            views: 0,
            visitors: 0,
            conversionRate: 0,
            requests: dashboardData.bookingStats.requests,
          }}
          charterPerformance={dashboardData.charterPerformance}
        />

        {/* Multiple Charters Support */}
        {charters.length > 1 && (
          <div className="p-5 transition-shadow duration-200 bg-white border shadow-sm rounded-2xl border-slate-200 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Your Charters ({charters.length})
              </h3>
              <Link
                href="/captain/form"
                className="inline-flex items-center gap-1 rounded-full bg-[#ec2227] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#d81e23] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:ring-offset-2"
              >
                <Ship className="w-4 h-4" /> Add Charter
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {charters.map((c, idx) => (
                <div
                  key={c.id}
                  className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-md focus-within:ring-2 focus-within:ring-[#ec2227] ${
                    idx === 0
                      ? "border-[#ec2227] bg-red-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-slate-900">
                        {c.name}
                      </p>
                      <p className="text-xs truncate text-slate-500 mt-0.5">
                        {c.city}, {c.state}
                      </p>
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        {c.trips.length} trips · {c.media.length} media
                      </p>
                    </div>
                    {idx === 0 && (
                      <span className="text-xs font-semibold text-[#ec2227] uppercase px-2 py-1 bg-red-100 rounded-full border border-red-200">
                        Active
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/captain/form?editCharterId=${c.id}${
                      adminUserId ? `&adminUserId=${adminUserId}` : ""
                    }`}
                    className="mt-3 inline-flex text-xs font-semibold text-slate-600 hover:text-[#ec2227] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#ec2227]"
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
          <div className="hidden p-5 transition-shadow duration-200 border border-blue-200 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-md">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex-1">
                <h3 className="mb-1 text-base font-semibold text-slate-900">
                  🚀 Upgrade to Operator
                </h3>
                <p className="mb-3 text-sm text-slate-700">
                  Manage multiple charters, add crew members, and scale your
                  fishing business.
                </p>
                <ul className="space-y-2 text-xs text-slate-700">
                  <li>✓ Unlimited charter listings</li>
                  <li>✓ Crew management system</li>
                  <li>✓ Advanced analytics & reporting</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>
              <div className="sm:text-right">
                <Link
                  href="/captain/upgrade"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                >
                  Upgrade Now
                </Link>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  Contact support for details
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Quick Links Section */}
        <QuickLinksSection adminUserId={adminUserId} />
      </div>
    </div>
  );
}
