import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

async function getCaptainProfile(adminUserId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/auth?mode=signin");

  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) redirect("/auth?mode=signin");

  const profile = await prisma.captainProfile.findUnique({
    where: { userId: effectiveUserId },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      phone: true,
      backupPhone: true,
      bio: true,
      experienceYrs: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!profile) {
    // If no profile exists, redirect to form to create charter first
    redirect("/captain/form");
  }

  return { profile, effectiveUserId };
}

export default async function CaptainProfilePage({
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

  const { profile } = await getCaptainProfile(adminUserId);

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
                Viewing profile for:{" "}
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

      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Captain Profile
        </h1>
        <p className="text-sm text-slate-500">
          Manage your professional profile and credentials
        </p>
      </div>

      <ProfileForm profile={profile} adminUserId={adminUserId} />
    </div>
  );
}
