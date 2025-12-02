/**
 * Market Users Management Page
 *
 * Admin interface for viewing and managing fishon-market users (anglers/guests).
 * Shows user list with bookings, reviews, and promo code stats.
 */

import { authOptions } from "@/lib/auth";
import {
  getMarketUsers,
  getMarketUserStats,
  type MarketUserFilters,
} from "@/lib/market-user-service";
import { isMarketDbConfigured } from "@/lib/prisma-market";
import {
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ShoppingBag,
  Star,
  Tag,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MarketUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) redirect("/auth?mode=signin&next=/staff/market-users");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");

  // Check if Market DB is configured
  if (!isMarketDbConfigured()) {
    return (
      <div className="p-6">
        <div className="p-8 text-center bg-white border rounded-2xl border-slate-200">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-900">
            Market Database Not Configured
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Please configure{" "}
            <code className="px-1 py-0.5 bg-slate-100 rounded">
              MARKET_DATABASE_URL
            </code>{" "}
            to access market user data.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const search = params.search || "";
  const roleFilter = (params.role as "ANGLER" | "GUEST" | "ADMIN" | "") || "";
  const emailVerifiedFilter =
    (params.emailVerified as "verified" | "unverified" | "") || "";
  const hasBookingsFilter = params.hasBookings || "";
  const hasReviewsFilter = params.hasReviews || "";
  const page = parseInt(params.page || "1");

  // Build filters
  const filters: MarketUserFilters = {};
  if (search) filters.search = search;
  if (roleFilter) filters.role = roleFilter;
  if (emailVerifiedFilter) filters.emailVerified = emailVerifiedFilter;
  if (hasBookingsFilter === "yes") filters.hasBookings = true;
  if (hasBookingsFilter === "no") filters.hasBookings = false;
  if (hasReviewsFilter === "yes") filters.hasReviews = true;
  if (hasReviewsFilter === "no") filters.hasReviews = false;

  // Fetch data
  const [{ users, pagination }, stats] = await Promise.all([
    getMarketUsers(filters, page),
    getMarketUserStats(),
  ]);

  // Build filter URL helper
  const buildFilterUrl = (newParams: Record<string, string>) => {
    const currentParams = new URLSearchParams();
    if (search) currentParams.set("search", search);
    if (roleFilter) currentParams.set("role", roleFilter);
    if (emailVerifiedFilter)
      currentParams.set("emailVerified", emailVerifiedFilter);
    if (hasBookingsFilter) currentParams.set("hasBookings", hasBookingsFilter);
    if (hasReviewsFilter) currentParams.set("hasReviews", hasReviewsFilter);

    // Override with new params
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });

    // Reset to page 1 when changing filters (except when changing page)
    if (!("page" in newParams)) {
      currentParams.delete("page");
    }

    return `/staff/market-users?${currentParams.toString()}`;
  };

  // Count active filters
  const activeFilterCount = [
    roleFilter,
    emailVerifiedFilter,
    hasBookingsFilter,
    hasReviewsFilter,
  ].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Market Users
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View and manage fishon.my user accounts
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {pagination.totalCount} user{pagination.totalCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4" />
            <span>Total</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.totalUsers}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Anglers</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">
            {stats.totalAnglers}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Guests</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-700">
            {stats.totalGuests}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <UserCheck className="w-4 h-4" />
            <span>Verified</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {stats.verifiedUsers}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <ShoppingBag className="w-4 h-4 text-purple-600" />
            <span>With Bookings</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-purple-700">
            {stats.usersWithBookings}
          </div>
        </div>
        <div className="p-4 bg-white border rounded-xl border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Star className="w-4 h-4 text-amber-500" />
            <span>With Reviews</span>
          </div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">
            {stats.usersWithReviews}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-6 bg-white border rounded-2xl border-slate-200">
        <div className="flex flex-col gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-400" />
            <form action="/staff/market-users" method="get">
              {/* Preserve filters in hidden inputs */}
              {roleFilter && (
                <input type="hidden" name="role" value={roleFilter} />
              )}
              {emailVerifiedFilter && (
                <input
                  type="hidden"
                  name="emailVerified"
                  value={emailVerifiedFilter}
                />
              )}
              {hasBookingsFilter && (
                <input
                  type="hidden"
                  name="hasBookings"
                  value={hasBookingsFilter}
                />
              )}
              {hasReviewsFilter && (
                <input
                  type="hidden"
                  name="hasReviews"
                  value={hasReviewsFilter}
                />
              )}
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search by email, name, phone, or user ID..."
                className="w-full py-2 pl-10 pr-4 text-sm border rounded-lg border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#ec2227] focus:border-transparent"
              />
            </form>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Filter className="w-4 h-4" />
              Filters:
              {activeFilterCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold text-white bg-[#ec2227] rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </div>

            {/* Role Filter */}
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildFilterUrl({ role: "" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  !roleFilter
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Roles
              </Link>
              <Link
                href={buildFilterUrl({ role: "ANGLER" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  roleFilter === "ANGLER"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                Anglers
              </Link>
              <Link
                href={buildFilterUrl({ role: "GUEST" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  roleFilter === "GUEST"
                    ? "bg-slate-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Guests
              </Link>
              <Link
                href={buildFilterUrl({ role: "ADMIN" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  roleFilter === "ADMIN"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                Admins
              </Link>
            </div>

            {/* Email Verified Filter */}
            <div className="flex gap-2">
              <Link
                href={buildFilterUrl({ emailVerified: "verified" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  emailVerifiedFilter === "verified"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                ✓ Verified
              </Link>
              <Link
                href={buildFilterUrl({ emailVerified: "unverified" })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  emailVerifiedFilter === "unverified"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                ⚠ Unverified
              </Link>
            </div>

            {/* Has Bookings Filter */}
            <div className="flex gap-2">
              <Link
                href={buildFilterUrl({
                  hasBookings: hasBookingsFilter === "yes" ? "" : "yes",
                })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  hasBookingsFilter === "yes"
                    ? "bg-purple-600 text-white"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                <Calendar className="inline w-3 h-3 mr-1" />
                Has Bookings
              </Link>
              <Link
                href={buildFilterUrl({
                  hasReviews: hasReviewsFilter === "yes" ? "" : "yes",
                })}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  hasReviewsFilter === "yes"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                <Star className="inline w-3 h-3 mr-1" />
                Has Reviews
              </Link>
            </div>

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <Link
                href="/staff/market-users"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 transition bg-red-50 rounded-lg hover:bg-red-100"
              >
                <X className="w-3 h-3" />
                Clear All
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="overflow-hidden bg-white border divide-y rounded-xl border-slate-200 divide-slate-200">
        {users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No users found
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {search || activeFilterCount > 0
                ? "Try adjusting your search or filters"
                : "No market users have been created yet"}
            </p>
          </div>
        ) : (
          users.map((user) => {
            const displayName =
              user.name ||
              `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
              "No name";

            return (
              <Link
                key={user.id}
                href={`/staff/market-users/${user.id}`}
                className="flex items-start justify-between gap-4 p-4 transition-colors hover:bg-slate-50 group"
              >
                <div className="flex items-start flex-1 min-w-0 gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-10 h-10 overflow-hidden rounded-full bg-slate-200">
                    {user.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.image}
                        alt={displayName}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-sm font-medium text-slate-500">
                        {displayName[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate text-slate-900">
                        {displayName}
                      </p>
                      {/* Role Badge */}
                      {user.role === "ANGLER" && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700">
                          ANGLER
                        </span>
                      )}
                      {user.role === "GUEST" && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
                          GUEST
                        </span>
                      )}
                      {user.role === "ADMIN" && (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-50 text-purple-700">
                          ADMIN
                        </span>
                      )}
                      {/* Email Verified Badge - OAuth users are considered verified */}
                      {user.emailVerified || user.isOAuthUser ? (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700">
                          ✓ Verified
                          {user.isOAuthUser && !user.emailVerified
                            ? " (Google)"
                            : ""}
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-50 text-amber-700">
                          Unverified
                        </span>
                      )}
                    </div>
                    <p className="text-sm truncate text-slate-600">
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-xs text-slate-500">{user.phone}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {user.city && user.state && (
                        <span>
                          {user.city}, {user.state}
                        </span>
                      )}
                      <span>
                        Joined {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                      {user._count.bookings > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {user._count.bookings} booking
                          {user._count.bookings !== 1 ? "s" : ""}
                        </span>
                      )}
                      {user._count.reviews > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          {user._count.reviews} review
                          {user._count.reviews !== 1 ? "s" : ""}
                        </span>
                      )}
                      {user._count.promoCodeAssignments > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {user._count.promoCodeAssignments} promo code
                          {user._count.promoCodeAssignments !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="flex-shrink-0 w-5 h-5 mt-3 text-slate-400 group-hover:text-slate-600" />
              </Link>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white border rounded-lg border-slate-200">
          <div className="text-sm text-slate-700">
            Showing{" "}
            <span className="font-medium">
              {(pagination.currentPage - 1) * 20 + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(pagination.currentPage * 20, pagination.totalCount)}
            </span>{" "}
            of <span className="font-medium">{pagination.totalCount}</span>{" "}
            results
          </div>
          <div className="flex gap-1">
            {/* Previous Button */}
            {pagination.hasPrevPage && (
              <Link
                href={buildFilterUrl({
                  page: (pagination.currentPage - 1).toString(),
                })}
                className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </Link>
            )}

            {/* Page Numbers */}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and 2 around current
                if (p === 1 || p === pagination.totalPages) return true;
                if (Math.abs(p - pagination.currentPage) <= 2) return true;
                return false;
              })
              .reduce((acc: (number | string)[], p, i, arr) => {
                // Add ellipsis between gaps
                if (i > 0 && arr[i - 1] !== p - 1) {
                  acc.push("...");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === "string" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-3 py-2 text-sm text-slate-400"
                  >
                    ...
                  </span>
                ) : (
                  <Link
                    key={p}
                    href={buildFilterUrl({ page: p.toString() })}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                      p === pagination.currentPage
                        ? "bg-slate-900 text-white"
                        : "text-slate-700 bg-white border border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </Link>
                )
              )}

            {/* Next Button */}
            {pagination.hasNextPage && (
              <Link
                href={buildFilterUrl({
                  page: (pagination.currentPage + 1).toString(),
                })}
                className="px-3 py-2 text-sm font-medium transition bg-white border rounded-lg text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
