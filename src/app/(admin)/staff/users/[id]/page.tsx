import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  Calendar,
  CheckCircle,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Key,
  Lock,
  Mail,
  Shield,
  Ship,
  Users,
  Video,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteUserButton } from "./_components/DeleteUserButton";
import { ForceSubmitButton } from "./_components/ForceSubmitButton";

async function forceSubmitDraft(formData: FormData) {
  "use server";
  const draftId = formData.get("draftId") as string;
  const targetUserId = formData.get("targetUserId") as string;

  if (!draftId || !targetUserId)
    return { success: false, error: "Missing parameters" };

  const session = await getServerSession(authOptions);
  if (!session?.user) return { success: false, error: "Unauthorized" };

  const user = session.user as { id: string; role?: string };
  if (user.role !== "STAFF" && user.role !== "ADMIN") {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    const draft = await prisma.charterDraft.findUnique({
      where: { id: draftId },
      include: { user: { select: { id: true } } },
    });

    if (!draft) return { success: false, error: "Draft not found" };
    if (draft.status !== "DRAFT") {
      return { success: false, error: "Draft is not in DRAFT status" };
    }

    const h = await import("next/headers").then((m) => m.headers());
    const host = (await h).get("host");
    const proto = (await h).get("x-forwarded-proto") || "http";
    const base = host?.startsWith("http") ? host : `${proto}://${host}`;
    const url = `${base}/api/charter-drafts/${draftId}/finalize?adminUserId=${targetUserId}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-draft-version": String(draft.version),
        cookie: (await h).get("cookie") || "",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let errorMessage = errorData.error || `HTTP ${response.status}`;
      if (errorData.issues && Array.isArray(errorData.issues)) {
        const issueDetails = errorData.issues
          .map(
            (issue: { path: unknown[]; message: string }) =>
              `${issue.path.join(".")}: ${issue.message}`
          )
          .join("; ");
        errorMessage = `Validation failed: ${issueDetails}`;
      }
      return { success: false, error: errorMessage };
    }

    const result = await response.json();
    revalidatePath(`/staff/users/${targetUserId}`);
    revalidatePath("/staff/users");

    return {
      success: true,
      charterId: result.charterId,
      message: "Draft successfully submitted",
    };
  } catch (error) {
    console.error("Force submit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/users");
  if (role !== "ADMIN") redirect("/staff"); // Only ADMIN can access user details

  const { id } = await params;

  // Fetch user with all related data
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      captainProfile: {
        include: {
          charters: {
            select: {
              id: true,
              name: true,
              isActive: true,
              createdAt: true,
            },
          },
          videos: {
            select: {
              id: true,
              processStatus: true,
              createdAt: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              createdAt: true,
            },
          },
        },
      },
      verification: true,
      ownedCharters: {
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
        },
      },
      drafts: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      ownedMedia: {
        select: {
          id: true,
          url: true,
          charterId: true,
          createdAt: true,
        },
      },
      ownedVideos: {
        select: {
          id: true,
          processStatus: true,
          charterId: true,
          createdAt: true,
        },
      },
      accounts: {
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
        },
      },
      sessions: {
        select: {
          id: true,
          expires: true,
          sessionToken: true,
        },
        orderBy: { expires: "desc" },
        take: 5,
      },
      notifications: {
        select: {
          id: true,
          type: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      payouts: {
        select: {
          id: true,
          batchId: true,
          status: true,
          netPayout: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      PasswordHistory: {
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      crewProfile: true,
      notificationPreferences: true,
    },
  });

  if (!user) {
    notFound();
  }

  const isLocked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
  const hasOAuthAccount = user.accounts.length > 0;
  const oauthProvider = hasOAuthAccount ? user.accounts[0].provider : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/staff/users"
            className="p-2 transition-colors rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              User Details
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Complete overview of user data
            </p>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="p-6 bg-white border rounded-xl border-slate-200">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-full bg-slate-200">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-2xl font-medium text-slate-500">
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-semibold">
                {user.name || "No name"}
              </h2>
              {user.role === "ADMIN" && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">
                  <Shield className="w-3 h-3 mr-1" />
                  ADMIN
                </span>
              )}
              {user.role === "STAFF" && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-full">
                  <Shield className="w-3 h-3 mr-1" />
                  STAFF
                </span>
              )}
              {isLocked && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </span>
              )}
              {/* Show OAuth linked status if user has OAuth account */}
              {hasOAuthAccount && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Linked with{" "}
                  {oauthProvider === "google" ? "Google" : oauthProvider}
                </span>
              )}
              {/* Only show email verification status for non-OAuth users */}
              {!hasOAuthAccount && !user.emailVerified && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Email Not Verified
                </span>
              )}
              {!hasOAuthAccount && user.emailVerified && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Email Verified
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Shield className="w-4 h-4" />
                <span className="font-medium">{user.role}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4" />
                <span>
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Key className="w-4 h-4" />
                <span>User ID: {user.id}</span>
              </div>
            </div>

            {/* Captain Profile Info */}
            {user.captainProfile && (
              <div className="p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50">
                <h3 className="mb-2 text-sm font-medium text-blue-900">
                  Captain Profile
                </h3>
                <div className="grid grid-cols-1 gap-2 text-sm text-blue-700 md:grid-cols-2">
                  <div>Display Name: {user.captainProfile.displayName}</div>
                  <div>Phone: {user.captainProfile.phone}</div>
                  <div>
                    Experience: {user.captainProfile.experienceYrs} years
                  </div>
                  <div>Charters: {user.captainProfile.charters.length}</div>
                </div>
              </div>
            )}

            {/* Security Info */}
            {(user.passwordMfaEnabled ||
              user.lockedUntil ||
              user.loginAttempts > 0) && (
              <div className="p-3 mt-4 border rounded-lg bg-amber-50 border-amber-200">
                <h3 className="mb-2 text-sm font-medium text-amber-900">
                  Security Status
                </h3>
                <div className="space-y-1 text-sm text-amber-700">
                  {user.passwordMfaEnabled && (
                    <div>✓ MFA Enabled ({user.passwordMfaMethod})</div>
                  )}
                  {user.loginAttempts > 0 && (
                    <div>Failed login attempts: {user.loginAttempts}</div>
                  )}
                  {isLocked && (
                    <div className="font-medium text-red-700">
                      Account locked until{" "}
                      {new Date(user.lockedUntil!).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Registration Progress Section */}
      {user.drafts.length > 0 && (
        <div className="p-6 border-2 bg-gradient-to-br from-emerald-50 to-cyan-50 border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 text-white rounded-full bg-emerald-600">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Charter Registration Progress
                </h3>
                <p className="text-sm text-slate-600">
                  {user.drafts.length} draft
                  {user.drafts.length !== 1 ? "s" : ""} in system
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {user.drafts.map((draft) => {
              const stepLabels = [
                "Basic Info",
                "Media Upload",
                "Boat Details",
                "Trips & Pricing",
                "Policies",
                "Review",
              ];
              const isDraftStatus = draft.status === "DRAFT";
              const isSubmitted = draft.status === "SUBMITTED";

              return (
                <div
                  key={draft.id}
                  className="p-4 bg-white border rounded-lg border-slate-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            isDraftStatus
                              ? "bg-yellow-100 text-yellow-700"
                              : isSubmitted
                                ? "bg-cyan-100 text-cyan-700"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {draft.status}
                        </span>
                        {isDraftStatus && "currentStep" in draft && (
                          <span className="text-xs text-slate-600">
                            Step {(draft.currentStep as number) + 1} of 6:{" "}
                            {
                              stepLabels[
                                Math.min(
                                  draft.currentStep as number,
                                  stepLabels.length - 1
                                )
                              ]
                            }
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        Draft ID: {draft.id}
                      </div>
                      <div className="text-xs text-slate-500">
                        Last updated:{" "}
                        {new Date(draft.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/staff/registrations/${draft.id}`}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Details
                      </Link>
                      {isDraftStatus && (
                        <ForceSubmitButton
                          draftId={draft.id}
                          targetUserId={user.id}
                          status={draft.status}
                          forceSubmitAction={forceSubmitDraft}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Data Tables Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Charters */}
        <DataCard
          title="Owned Charters"
          count={user.ownedCharters.length}
          icon={<Ship className="w-5 h-5" />}
        >
          {user.ownedCharters.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.ownedCharters.map((charter) => (
                <div
                  key={charter.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <div className="text-sm font-medium">{charter.name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(charter.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {charter.isActive ? (
                      <span className="text-xs text-emerald-600">Active</span>
                    ) : (
                      <span className="text-xs text-slate-500">Inactive</span>
                    )}
                    <Link
                      href={`/staff/charters/${charter.id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">
              No charters
            </p>
          )}
        </DataCard>

        {/* Crew Member Profile */}
        <DataCard
          title="Crew Member Profile"
          count={user.crewProfile ? 1 : 0}
          icon={<Users className="w-5 h-5" />}
        >
          {user.crewProfile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    user.crewProfile.isActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {user.crewProfile.isActive ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </>
                  ) : (
                    "Inactive"
                  )}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Display Name</span>
                  <span className="font-medium">
                    {user.crewProfile.displayName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Primary Role</span>
                  <span className="font-medium capitalize">
                    {user.crewProfile.primaryRole
                      .toLowerCase()
                      .replace("_", " ")}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Experience</span>
                  <span className="font-medium">
                    {user.crewProfile.experienceYrs} years
                  </span>
                </div>
                {user.crewProfile.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Phone</span>
                    <span className="text-xs font-medium">
                      {user.crewProfile.phone}
                    </span>
                  </div>
                )}
              </div>

              {user.crewProfile.skills &&
                user.crewProfile.skills.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="mb-2 text-xs text-slate-600">Skills:</div>
                    <div className="flex flex-wrap gap-1">
                      {user.crewProfile.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {user.crewProfile.certifications &&
                user.crewProfile.certifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="mb-2 text-xs text-slate-600">
                      Certifications:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {user.crewProfile.certifications.map((cert, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {user.crewProfile.emergencyName && (
                <div className="pt-2 border-t border-slate-200">
                  <div className="mb-1 text-xs text-slate-600">
                    Emergency Contact:
                  </div>
                  <div className="text-xs text-slate-700">
                    <div>
                      {user.crewProfile.emergencyName}
                      {user.crewProfile.emergencyRelation &&
                        ` (${user.crewProfile.emergencyRelation})`}
                    </div>
                    {user.crewProfile.emergencyPhone && (
                      <div className="text-slate-500">
                        {user.crewProfile.emergencyPhone}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">
              No crew profile
            </p>
          )}
        </DataCard>

        {/* Media */}
        <DataCard
          title="Media Files"
          count={user.ownedMedia.length}
          icon={<ImageIcon className="w-5 h-5" />}
        >
          {user.ownedMedia.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {user.ownedMedia.slice(0, 6).map((media) => (
                <div
                  key={media.id}
                  className="overflow-hidden rounded-lg aspect-square bg-slate-100"
                >
                  <img
                    src={media.url}
                    alt="Media"
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
              {user.ownedMedia.length > 6 && (
                <div className="flex items-center justify-center text-sm rounded-lg aspect-square bg-slate-100 text-slate-600">
                  +{user.ownedMedia.length - 6} more
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">No media</p>
          )}
        </DataCard>

        {/* Videos */}
        <DataCard
          title="Videos"
          count={user.ownedVideos.length}
          icon={<Video className="w-5 h-5" />}
        >
          {user.ownedVideos.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.ownedVideos.slice(0, 5).map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <div className="text-xs text-slate-500">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      video.processStatus === "ready"
                        ? "bg-emerald-100 text-emerald-700"
                        : video.processStatus === "processing"
                          ? "bg-blue-100 text-blue-700"
                          : video.processStatus === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {video.processStatus}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">No videos</p>
          )}
        </DataCard>

        {/* Authentication Info */}
        <DataCard
          title="Authentication"
          count={user.accounts.length}
          icon={<Key className="w-5 h-5" />}
        >
          <div className="space-y-3 text-sm">
            {/* Account Type */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Account Type</span>
              <span className="font-medium">
                {user.accounts.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    OAuth ({user.accounts[0].provider})
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                    <Mail className="w-3 h-3" />
                    Email/Password
                  </span>
                )}
              </span>
            </div>

            {/* Email Verification */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Email Status</span>
              <span className="font-medium">
                {user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                    <AlertCircle className="w-3 h-3" />
                    Not Verified
                  </span>
                )}
              </span>
            </div>

            {/* MFA Status */}
            {user.passwordMfaEnabled && (
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Two-Factor Auth</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                  <Shield className="w-3 h-3" />
                  {user.passwordMfaMethod?.toUpperCase()}
                </span>
              </div>
            )}

            {/* Session Strategy */}
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Session Type</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                <Lock className="w-3 h-3" />
                JWT (Stateless)
              </span>
            </div>

            {/* Connected OAuth Accounts */}
            {user.accounts.length > 0 && (
              <div className="pt-2 mt-2 border-t border-slate-200">
                <div className="mb-2 text-xs text-slate-600">
                  Connected OAuth:
                </div>
                {user.accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-xs capitalize">
                      {account.provider}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {account.providerAccountId.slice(0, 12)}...
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DataCard>

        {/* Captain Verification */}
        <DataCard
          title="Captain Verification"
          count={user.verification ? 1 : 0}
          icon={<Shield className="w-5 h-5" />}
        >
          {user.verification ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-600">Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    String(user.verification.status).toUpperCase() ===
                    "VERIFIED"
                      ? "bg-emerald-100 text-emerald-700"
                      : String(user.verification.status).toUpperCase() ===
                          "PENDING"
                        ? "bg-yellow-100 text-yellow-700"
                        : String(user.verification.status).toUpperCase() ===
                            "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {String(user.verification.status).toUpperCase() ===
                    "VERIFIED" && <CheckCircle className="w-3 h-3" />}
                  {String(user.verification.status).toUpperCase() ===
                    "PENDING" && <AlertCircle className="w-3 h-3" />}
                  {String(user.verification.status).toUpperCase()}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    {user.verification.idFront ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">ID Front</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.verification.idBack ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">ID Back</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.verification.captainLicense ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">
                      Captain License
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.verification.boatRegistration ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">
                      Boat Registration
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.verification.fishingLicense ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">
                      Fishing License
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.verification.bankStatement ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs text-slate-600">
                      Bank Statement
                    </span>
                  </div>
                </div>
              </div>

              {user.verification.bankName && (
                <div className="pt-2 mt-2 border-t border-slate-200">
                  <div className="mb-2 text-xs text-slate-600">
                    Banking Information:
                  </div>
                  <div className="space-y-1 text-xs text-slate-700">
                    <div>
                      <span className="text-slate-500">Bank:</span>{" "}
                      {user.verification.bankName}
                    </div>
                    {user.verification.bankBranch && (
                      <div>
                        <span className="text-slate-500">Branch:</span>{" "}
                        {user.verification.bankBranch}
                      </div>
                    )}
                    {user.verification.bankAccountHolder && (
                      <div>
                        <span className="text-slate-500">Account Holder:</span>{" "}
                        {user.verification.bankAccountHolder}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 text-xs border-t text-slate-500 border-slate-200">
                <div>
                  Created:{" "}
                  {new Date(user.verification.createdAt).toLocaleString()}
                </div>
                <div>
                  Updated:{" "}
                  {new Date(user.verification.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">
              No verification submitted
            </p>
          )}
        </DataCard>

        {/* Sessions */}
        <DataCard
          title="Sessions"
          count={user.sessions.length}
          icon={<Lock className="w-5 h-5" />}
        >
          {user.sessions.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.sessions.map((session) => {
                const isExpired = new Date(session.expires) < new Date();
                return (
                  <div key={session.id} className="py-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {isExpired ? "Expired" : "Expires"}:{" "}
                        {new Date(session.expires).toLocaleString()}
                      </div>
                      {isExpired ? (
                        <span className="text-xs text-slate-400">Expired</span>
                      ) : (
                        <span className="text-xs text-emerald-600">Active</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-sm text-center text-slate-500">
              <p className="mb-2">No database sessions</p>
              <p className="p-2 text-xs text-blue-700 rounded bg-blue-50">
                ℹ️ Using JWT session strategy - sessions stored in secure
                cookies, not database
              </p>
            </div>
          )}
        </DataCard>

        {/* Notifications */}
        <DataCard
          title="Recent Notifications"
          count={user.notifications.length}
          icon={<Bell className="w-5 h-5" />}
        >
          {user.notifications.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{notification.type}</div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        notification.status === "UNREAD"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {notification.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">
              No notifications
            </p>
          )}
        </DataCard>

        {/* Payouts */}
        <DataCard
          title="Payouts"
          count={user.payouts.length}
          icon={<CreditCard className="w-5 h-5" />}
        >
          {user.payouts.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {user.payouts.map((payout) => (
                <div key={payout.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        RM {payout.netPayout.toString()}
                      </div>
                      <div className="text-xs text-slate-500">
                        {payout.batchId}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        payout.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-700"
                          : payout.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : payout.status === "FAILED"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {payout.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-center text-slate-500">
              No payouts
            </p>
          )}
        </DataCard>
      </div>

      {/* Danger Zone */}
      <div className="p-6 border border-red-200 bg-red-50 rounded-xl">
        <h3 className="flex items-center gap-2 mb-2 text-lg font-semibold text-red-900">
          <AlertCircle className="w-5 h-5" />
          Danger Zone
        </h3>
        <p className="mb-4 text-sm text-red-700">
          Irreversible actions that will permanently affect this user&apos;s
          data.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-white border border-red-200 rounded-lg">
            <div>
              <div className="text-sm font-medium">Delete User Account</div>
              <div className="text-xs text-slate-600">
                Permanently delete this user and all associated data
              </div>
            </div>
            <DeleteUserButton
              userId={user.id}
              userName={user.name || user.email}
              variant="danger"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataCard({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-white border rounded-xl border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-slate-600">{icon}</div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <span className="text-sm font-medium text-slate-600">{count}</span>
      </div>
      <div className="overflow-y-auto max-h-64">{children}</div>
    </div>
  );
}
