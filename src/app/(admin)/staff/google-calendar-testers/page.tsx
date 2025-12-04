import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GoogleCalendarTestersClient } from "./_components/GoogleCalendarTestersClient";

export const metadata = {
  title: "Google Calendar Test Users | Staff",
  description: "Manage users who can access Google Calendar integration",
};

export default async function GoogleCalendarTestersPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    redirect("/auth?mode=signin&next=/staff/google-calendar-testers");
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    redirect("/captain");
  }

  // Fetch test users
  const testUsers = await prisma.user.findMany({
    where: { googleCalendarTestUser: true },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      googleCalendarSettings: {
        select: {
          isConnected: true,
          connectedAt: true,
          googleEmail: true,
          lastSyncAt: true,
        },
      },
      captainProfile: {
        select: {
          displayName: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Format for client
  const formattedTestUsers = testUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name:
      u.captainProfile?.displayName ||
      u.name ||
      `${u.firstName || ""} ${u.lastName || ""}`.trim() ||
      u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    googleCalendar: u.googleCalendarSettings
      ? {
          isConnected: u.googleCalendarSettings.isConnected,
          connectedAt:
            u.googleCalendarSettings.connectedAt?.toISOString() || null,
          googleEmail: u.googleCalendarSettings.googleEmail,
          lastSyncAt:
            u.googleCalendarSettings.lastSyncAt?.toISOString() || null,
        }
      : null,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Google Calendar Test Users
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage captains who can access Google Calendar integration (Beta)
        </p>
      </div>

      {/* Instructions */}
      <div className="p-4 text-sm border rounded-lg bg-amber-50 border-amber-200 text-amber-800">
        <p className="font-medium">📋 Important:</p>
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>
            Add users here AND in Google Cloud Console → OAuth consent screen →
            Test users
          </li>
          <li>Users must be added to both places to use the feature</li>
          <li>
            Maximum 100 test users while app is in &quot;Testing&quot; mode
          </li>
        </ul>
      </div>

      {/* Client component for interactive list */}
      <GoogleCalendarTestersClient initialTestUsers={formattedTestUsers} />
    </div>
  );
}
