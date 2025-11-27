import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ChevronRight, Filter, Search, Users, X } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/users");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = (params.role as "ADMIN" | "STAFF" | "CAPTAIN" | "") || "";
  const statusFilter = params.status || "";
  const accountTypeFilter = params.accountType || "";
  const charterFilter = params.charter || "";
  const draftFilter = params.draft || ""; // all, has, in-progress, submitted
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build search and filter conditions
  const where: Prisma.UserWhereInput = {};

  // Search filter
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }

  // Role filter
  if (roleFilter) {
    where.role = roleFilter as Prisma.EnumRoleFilter;
  }

  // Status filter
  if (statusFilter === "locked") {
    where.lockedUntil = { gt: new Date() };
  } else if (statusFilter === "verified") {
    where.emailVerified = { not: null };
  } else if (statusFilter === "unverified") {
    where.emailVerified = null;
  }

  // Account type filter
  if (accountTypeFilter === "oauth") {
    where.accounts = { some: {} };
  } else if (accountTypeFilter === "email") {
    where.accounts = { none: {} };
  }

  // Charter filter
  if (charterFilter === "has") {
    where.ownedCharters = { some: {} };
  } else if (charterFilter === "none") {
    where.ownedCharters = { none: {} };
  }

  // Draft/Registration filter
  if (draftFilter === "has") {
    where.drafts = { some: {} };
  } else if (draftFilter === "in-progress") {
    where.drafts = { some: { status: "DRAFT" } };
  } else if (draftFilter === "submitted") {
    where.drafts = { some: { status: "SUBMITTED" } };
  }

  // Fetch users with counts of related data
  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        lockedUntil: true,
        _count: {
          select: {
            ownedCharters: true,
            drafts: true,
            ownedMedia: true,
            ownedVideos: true,
            accounts: true,
            sessions: true,
            notifications: true,
            payouts: true,
          },
        },
        accounts: {
          select: {
            provider: true,
          },
          take: 1,
        },
        captainProfile: {
          select: {
            id: true,
            displayName: true,
            _count: {
              select: {
                charters: true,
                videos: true,
                media: true,
              },
            },
          },
        },
        drafts: {
          select: {
            id: true,
            status: true,
            currentStep: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor and manage user accounts and related data
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {totalCount} user{totalCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Search and Filters */}
      <form method="get" className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by email, name, or user ID..."
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            name="role"
            defaultValue={roleFilter}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Staff</option>
            <option value="CAPTAIN">Captain</option>
          </select>

          {/* Status Filter */}
          <select
            name="status"
            defaultValue={statusFilter}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="verified">Email Verified</option>
            <option value="unverified">Email Unverified</option>
            <option value="locked">Locked</option>
          </select>

          {/* Account Type Filter */}
          <select
            name="accountType"
            defaultValue={accountTypeFilter}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          >
            <option value="">All Account Types</option>
            <option value="oauth">OAuth (Google)</option>
            <option value="email">Email/Password</option>
          </select>

          {/* Charter Filter */}
          <select
            name="charter"
            defaultValue={charterFilter}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          >
            <option value="">All Users</option>
            <option value="has">Has Charters</option>
            <option value="none">No Charters</option>
          </select>

          {/* Draft/Registration Filter */}
          <select
            name="draft"
            defaultValue={draftFilter}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
          >
            <option value="">All Registrations</option>
            <option value="has">Has Drafts</option>
            <option value="in-progress">In Progress</option>
            <option value="submitted">Submitted</option>
          </select>

          {/* Apply Button */}
          <button
            type="submit"
            className="px-4 py-1.5 text-sm bg-[#ec2227] text-white rounded-lg hover:bg-[#d11d21] transition-colors"
          >
            Apply Filters
          </button>

          {/* Clear Filters */}
          {(search ||
            roleFilter ||
            statusFilter ||
            accountTypeFilter ||
            charterFilter ||
            draftFilter) && (
            <Link
              href="/staff/users"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X className="w-3 h-3" />
              Clear All
            </Link>
          )}
        </div>
        {/* Active Filters Display */}
        {(roleFilter ||
          statusFilter ||
          accountTypeFilter ||
          charterFilter ||
          draftFilter) && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-600">Active filters:</span>
            {roleFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-purple-700 bg-purple-100 rounded-md">
                Role: {roleFilter}
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-blue-700 bg-blue-100 rounded-md">
                Status:{" "}
                {statusFilter === "verified"
                  ? "Email Verified"
                  : statusFilter === "unverified"
                    ? "Email Unverified"
                    : "Locked"}
              </span>
            )}
            {accountTypeFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-green-700 bg-green-100 rounded-md">
                Type:{" "}
                {accountTypeFilter === "oauth" ? "OAuth" : "Email/Password"}
              </span>
            )}
            {charterFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-orange-700 bg-orange-100 rounded-md">
                Charters:{" "}
                {charterFilter === "has" ? "Has Charters" : "No Charters"}
              </span>
            )}
            {draftFilter && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 text-emerald-700">
                Registrations:{" "}
                {draftFilter === "has"
                  ? "Has Drafts"
                  : draftFilter === "in-progress"
                    ? "In Progress"
                    : "Submitted"}
              </span>
            )}
          </div>
        )}
      </form>

      {/* Users List */}
      <div className="bg-white border divide-y rounded-xl border-slate-200 divide-slate-200">
        {users.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No users found</p>
          </div>
        ) : (
          users.map((user) => {
            const isLocked =
              user.lockedUntil && new Date(user.lockedUntil) > new Date();
            const hasProfile = !!user.captainProfile;
            const hasOAuthAccount = user.accounts.length > 0;
            const oauthProvider = hasOAuthAccount
              ? user.accounts[0].provider
              : null;
            const draftInProgress = user.drafts?.filter(
              (d) => d.status === "DRAFT"
            );
            const draftSubmitted = user.drafts?.filter(
              (d) => d.status === "SUBMITTED"
            );
            const totalRelatedRecords =
              user._count.ownedCharters +
              user._count.drafts +
              user._count.ownedMedia +
              user._count.ownedVideos +
              user._count.accounts +
              user._count.sessions +
              user._count.notifications +
              user._count.payouts +
              (hasProfile && user.captainProfile
                ? user.captainProfile._count.charters
                : 0) +
              (hasProfile && user.captainProfile
                ? user.captainProfile._count.videos
                : 0) +
              (hasProfile && user.captainProfile
                ? user.captainProfile._count.media
                : 0);

            return (
              <Link
                key={user.id}
                href={`/staff/users/${user.id}`}
                className="block p-4 transition-colors hover:bg-slate-50 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start flex-1 min-w-0 gap-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-10 h-10 overflow-hidden rounded-full bg-slate-200">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name || user.email}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-sm font-medium text-slate-500">
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate text-slate-900">
                          {user.name || "No name"}
                        </p>
                        {user.role === "ADMIN" && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            ADMIN
                          </span>
                        )}
                        {user.role === "STAFF" && (
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            STAFF
                          </span>
                        )}
                        {isLocked && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            Locked
                          </span>
                        )}
                        {hasOAuthAccount && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {oauthProvider === "google"
                              ? "Google"
                              : oauthProvider}
                          </span>
                        )}
                        {!hasOAuthAccount && !user.emailVerified && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Unverified
                          </span>
                        )}
                        {draftInProgress && draftInProgress.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            In Progress ({draftInProgress.length})
                          </span>
                        )}
                        {draftSubmitted && draftSubmitted.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-700">
                            Submitted ({draftSubmitted.length})
                          </span>
                        )}
                      </div>
                      <p className="text-sm truncate text-slate-600">
                        {user.email}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {user.role}
                        </span>
                        {hasProfile && user.captainProfile && (
                          <span>
                            Captain: {user.captainProfile.displayName}
                          </span>
                        )}
                        <span>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                        {user._count.ownedCharters > 0 && (
                          <span>
                            {user._count.ownedCharters} charter
                            {user._count.ownedCharters !== 1 ? "s" : ""}
                          </span>
                        )}
                        {user._count.drafts > 0 && (
                          <span>
                            {user._count.drafts} draft
                            {user._count.drafts !== 1 ? "s" : ""}
                          </span>
                        )}
                        {user._count.ownedMedia > 0 && (
                          <span>{user._count.ownedMedia} media</span>
                        )}
                        {user._count.ownedVideos > 0 && (
                          <span>{user._count.ownedVideos} videos</span>
                        )}
                        {totalRelatedRecords > 0 && (
                          <span className="font-medium">
                            {totalRelatedRecords} total records
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="flex-shrink-0 w-5 h-5 text-slate-400 group-hover:text-slate-600" />
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          {/* First Page */}
          {page > 1 && (
            <Link
              href={`/staff/users?page=1${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
              className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
              title="First page"
            >
              ««
            </Link>
          )}

          {/* Previous Page */}
          {page > 1 && (
            <Link
              href={`/staff/users?page=${page - 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
              className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
            >
              ‹ Previous
            </Link>
          )}

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {/* Show first page if not in first 3 pages */}
            {page > 3 && (
              <>
                <Link
                  href={`/staff/users?page=1${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
                  className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  1
                </Link>
                {page > 4 && <span className="px-2 text-slate-400">...</span>}
              </>
            )}

            {/* Show pages around current page */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show current page and 2 pages before/after
                return p >= page - 2 && p <= page + 2;
              })
              .map((p) => (
                <Link
                  key={p}
                  href={`/staff/users?page=${p}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors ${
                    p === page
                      ? "bg-[#ec2227] text-white border-[#ec2227] font-medium"
                      : "border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </Link>
              ))}

            {/* Show last page if not in last 3 pages */}
            {page < totalPages - 2 && (
              <>
                {page < totalPages - 3 && (
                  <span className="px-2 text-slate-400">...</span>
                )}
                <Link
                  href={`/staff/users?page=${totalPages}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
                  className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  {totalPages}
                </Link>
              </>
            )}
          </div>

          {/* Next Page */}
          {page < totalPages && (
            <Link
              href={`/staff/users?page=${page + 1}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
              className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Next ›
            </Link>
          )}

          {/* Last Page */}
          {page < totalPages && (
            <Link
              href={`/staff/users?page=${totalPages}${search ? `&search=${search}` : ""}${roleFilter ? `&role=${roleFilter}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}${accountTypeFilter ? `&accountType=${accountTypeFilter}` : ""}${charterFilter ? `&charter=${charterFilter}` : ""}${draftFilter ? `&draft=${draftFilter}` : ""}`}
              className="px-3 py-2 text-sm border rounded-lg border-slate-300 hover:bg-slate-50 transition-colors"
              title="Last page"
            >
              »»
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
