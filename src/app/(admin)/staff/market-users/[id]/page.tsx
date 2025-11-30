/**
 * Market User Detail Page
 *
 * Shows detailed information about a specific market user including:
 * - Profile information
 * - Booking history
 * - Reviews submitted
 * - Promo codes assigned
 */

import { authOptions } from "@/lib/auth";
import { getMarketUserById } from "@/lib/market-user-service";
import { prisma } from "@/lib/prisma";
import { isMarketDbConfigured } from "@/lib/prisma-market";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Star,
  Tag,
  User,
  XCircle,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// Status badge component
function BookingStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<
    string,
    { label: string; className: string; icon: React.ReactNode }
  > = {
    PENDING: {
      label: "Pending",
      className: "bg-amber-100 text-amber-700",
      icon: <Clock className="w-3 h-3" />,
    },
    AWAITING_PAYMENT: {
      label: "Awaiting Payment",
      className: "bg-yellow-100 text-yellow-700",
      icon: <CreditCard className="w-3 h-3" />,
    },
    PAYMENT_AUTHORIZED: {
      label: "Payment Authorized",
      className: "bg-indigo-100 text-indigo-700",
      icon: <CreditCard className="w-3 h-3" />,
    },
    PAID: {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    UNDER_REVIEW: {
      label: "Under Review",
      className: "bg-orange-100 text-orange-700",
      icon: <ShieldAlert className="w-3 h-3" />,
    },
    COMPLETED: {
      label: "Completed",
      className: "bg-blue-100 text-blue-700",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-100 text-red-700",
      icon: <XCircle className="w-3 h-3" />,
    },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-slate-100 text-slate-700",
      icon: <XCircle className="w-3 h-3" />,
    },
    EXPIRED: {
      label: "Expired",
      className: "bg-slate-100 text-slate-600",
      icon: <Clock className="w-3 h-3" />,
    },
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700",
    icon: null,
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

// Promo code status badge
function PromoCodeStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
    INACTIVE: { label: "Inactive", className: "bg-slate-100 text-slate-700" },
    EXPIRED: { label: "Expired", className: "bg-red-100 text-red-700" },
    EXHAUSTED: { label: "Exhausted", className: "bg-amber-100 text-amber-700" },
  };

  const config = statusConfig[status] || {
    label: status,
    className: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

// Rating stars component
function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default async function MarketUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const user = await getMarketUserById(id);

  if (!user) {
    notFound();
  }

  // Fetch charter names for bookings
  const charterIds = [...new Set(user.bookings.map((b) => b.charterId))];
  const charters = await prisma.charter.findMany({
    where: { id: { in: charterIds } },
    select: { id: true, name: true },
  });
  const charterNameMap = new Map(charters.map((c) => [c.id, c.name]));

  const displayName =
    user.name ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    "No name";

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Link
        href="/staff/market-users"
        className="inline-flex items-center gap-2 text-sm font-medium transition text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Market Users
      </Link>

      {/* Header with User Info */}
      <div className="p-6 bg-white border rounded-2xl border-slate-200">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          {/* Avatar */}
          <div className="flex-shrink-0 w-20 h-20 overflow-hidden rounded-full bg-slate-200">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={displayName}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-2xl font-medium text-slate-500">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {displayName}
              </h1>
              {/* Role Badge */}
              {user.role === "ANGLER" && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                  ANGLER
                </span>
              )}
              {user.role === "GUEST" && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  GUEST
                </span>
              )}
              {user.role === "ADMIN" && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                  ADMIN
                </span>
              )}
              {/* Email Verified Badge */}
              {user.emailVerified ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  ✓ Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  Email Unverified
                </span>
              )}
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <a
                  href={`mailto:${user.email}`}
                  className="hover:text-slate-900 hover:underline"
                >
                  {user.email}
                </a>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a
                    href={`tel:${user.phone}`}
                    className="hover:text-slate-900 hover:underline"
                  >
                    {user.phone}
                  </a>
                </div>
              )}
              {(user.city || user.state) && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>
                    {[user.city, user.state, user.country]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="mt-3 text-sm text-slate-600">{user.bio}</p>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-6 pt-4 mt-4 border-t border-slate-200">
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {user._count.bookings}
                </div>
                <div className="text-xs text-slate-600">Bookings</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {user._count.reviews}
                </div>
                <div className="text-xs text-slate-600">Reviews</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-slate-900">
                  {user._count.promoCodeAssignments}
                </div>
                <div className="text-xs text-slate-600">Promo Codes</div>
              </div>
              <div>
                <div className="text-sm text-slate-900">
                  {new Date(user.createdAt).toLocaleDateString("en-MY", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <div className="text-xs text-slate-600">Member Since</div>
              </div>
            </div>
          </div>

          {/* Emergency Contact (if available) */}
          {user.emergencyName && (
            <div className="flex-shrink-0 p-4 rounded-xl bg-slate-50">
              <div className="text-xs font-medium uppercase text-slate-500">
                Emergency Contact
              </div>
              <div className="mt-1 font-medium text-slate-900">
                {user.emergencyName}
              </div>
              {user.emergencyPhone && (
                <div className="text-sm text-slate-600">
                  {user.emergencyPhone}
                </div>
              )}
              {user.emergencyRelation && (
                <div className="text-xs text-slate-500">
                  ({user.emergencyRelation})
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bookings Section */}
        <div className="p-6 bg-white border rounded-2xl border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Calendar className="w-5 h-5" />
              Booking History
            </h2>
            <span className="text-sm text-slate-600">
              {user.bookings.length} booking
              {user.bookings.length !== 1 ? "s" : ""}
            </span>
          </div>

          {user.bookings.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-96">
              {user.bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/staff/bookings/${booking.id}`}
                  className="block p-3 transition-colors border rounded-lg border-slate-200 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-slate-900">
                        {charterNameMap.get(booking.charterId) ||
                          "Unknown Charter"}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        <span>
                          {new Date(booking.date).toLocaleDateString("en-MY", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {booking.days} day{booking.days !== 1 ? "s" : ""}
                        </span>
                        <span>•</span>
                        <span className="font-medium">
                          RM {booking.finalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <BookingStatusBadge status={booking.status} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <span
                      className={`px-1.5 py-0.5 rounded ${
                        booking.bookingFlowType === "AUTO"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {booking.bookingFlowType}
                    </span>
                    {booking.paymentMethod && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {booking.paymentMethod}
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Reviews Section */}
        <div className="p-6 bg-white border rounded-2xl border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Star className="w-5 h-5" />
              Reviews
            </h2>
            <span className="text-sm text-slate-600">
              {user.reviews.length} review{user.reviews.length !== 1 ? "s" : ""}
            </span>
          </div>

          {user.reviews.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Star className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">No reviews yet</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-96">
              {user.reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-3 border rounded-lg border-slate-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-slate-900">
                        {review.charterName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <RatingStars rating={review.overallRating} />
                        <span className="text-xs text-slate-500">
                          {new Date(review.tripDate).toLocaleDateString(
                            "en-MY",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {review.published ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Published
                        </span>
                      ) : review.approved ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="mt-2 text-sm line-clamp-2 text-slate-600">
                      {review.comment}
                    </p>
                  )}
                  {review.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {review.badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge}
                          className="px-1.5 py-0.5 text-xs rounded bg-slate-100 text-slate-600"
                        >
                          {badge}
                        </span>
                      ))}
                      {review.badges.length > 3 && (
                        <span className="text-xs text-slate-500">
                          +{review.badges.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promo Codes Section */}
        <div className="p-6 bg-white border rounded-2xl border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Tag className="w-5 h-5" />
              Promo Codes
            </h2>
            <span className="text-sm text-slate-600">
              {user.promoCodeAssignments.length} code
              {user.promoCodeAssignments.length !== 1 ? "s" : ""}
            </span>
          </div>

          {user.promoCodeAssignments.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Tag className="w-8 h-8 mx-auto mb-2 text-slate-400" />
              <p className="text-sm">No promo codes assigned</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Code
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Discount
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Assigned
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left uppercase text-slate-500">
                      Used
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {user.promoCodeAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <code className="px-2 py-1 text-sm font-mono rounded bg-slate-100 text-slate-900">
                          {assignment.promoCode.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                        {assignment.promoCode.name}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">
                        {assignment.promoCode.type === "PERCENTAGE" &&
                        assignment.promoCode.percentage
                          ? `${assignment.promoCode.percentage}% off`
                          : assignment.promoCode.type}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <PromoCodeStatusBadge
                          status={assignment.promoCode.status}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">
                        {new Date(assignment.assignedAt).toLocaleDateString(
                          "en-MY",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {assignment.usedAt ? (
                          <span className="text-emerald-600">
                            {new Date(assignment.usedAt).toLocaleDateString(
                              "en-MY",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not used</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Address & Additional Info */}
        {(user.streetAddress || user.emergencyName) && (
          <div className="p-6 bg-white border rounded-2xl border-slate-200 lg:col-span-2">
            <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-slate-900">
              <User className="w-5 h-5" />
              Additional Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Address */}
              {user.streetAddress && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700">
                    Address
                  </h3>
                  <div className="mt-1 text-sm text-slate-600">
                    {user.streetAddress}
                    {user.postcode && <>, {user.postcode}</>}
                    <br />
                    {[user.city, user.state, user.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              )}

              {/* Emergency Contact */}
              {user.emergencyName && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700">
                    Emergency Contact
                  </h3>
                  <div className="mt-1 text-sm text-slate-600">
                    <div className="font-medium">{user.emergencyName}</div>
                    {user.emergencyPhone && <div>{user.emergencyPhone}</div>}
                    {user.emergencyRelation && (
                      <div className="text-xs text-slate-500">
                        Relationship: {user.emergencyRelation}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User ID Footer */}
      <div className="p-4 text-xs border rounded-lg border-slate-200 bg-slate-50 text-slate-500">
        <div className="flex items-center justify-between">
          <span>
            User ID:{" "}
            <code className="px-1 py-0.5 rounded bg-slate-200">{user.id}</code>
          </span>
          <span>
            Last updated:{" "}
            {new Date(user.updatedAt).toLocaleDateString("en-MY", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
