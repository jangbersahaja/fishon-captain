import ReviewsList from "@/components/charter/ReviewsList";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MarketReview } from "@/lib/review-service";
import { getCaptainReviews, getCaptainReviewStats } from "@/lib/review-service";
import { summariseBadges } from "@/utils/reviewBadges";
import { Star } from "lucide-react";
import { getServerSession } from "next-auth";

export const dynamic = "force-dynamic";

// Convert MarketReview to BookingReview format for ReviewsList component
function convertToBookingReview(review: MarketReview) {
  // Parse charterId - it's stored as string but BookingReview expects number
  const charterId = parseInt(review.captainCharterId, 10);

  return {
    id: review.id,
    charterId: Number.isNaN(charterId) ? 0 : charterId,
    tripName: review.charterName,
    bookedDate: review.tripDate?.toISOString().split("T")[0] || "",
    fishingDate: review.tripDate?.toISOString().split("T")[0] || "",
    adults: 0, // Not available in review data
    children: 0, // Not available in review data
    totalPaid: 0, // Not available in review data
    reviewerName: review.user?.name || "Anonymous",
    reviewerInitials: review.user?.name?.slice(0, 2).toUpperCase() || "AN",
    overallRating: review.overallRating,
    review: review.comment || "",
    badges: review.badges,
    createdAt: review.createdAt.toISOString(),
    media: [
      ...review.photos.map((url, idx) => ({
        id: `photo-${review.id}-${idx}`,
        type: "image" as const,
        url,
        alt: `Photo ${idx + 1}`,
      })),
      ...review.videos.map((url, idx) => ({
        id: `video-${review.id}-${idx}`,
        type: "video" as const,
        url,
        alt: `Video ${idx + 1}`,
        poster: undefined,
      })),
    ],
  };
}

export default async function CaptainReviewsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Reviews
        </h1>
        <p className="mt-4 text-slate-600">
          You must be signed in to view reviews.
        </p>
      </div>
    );
  }

  // Get captain's charters
  const captain = await prisma.captainProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      charters: {
        where: { isActive: true },
        select: { id: true, name: true },
      },
    },
  });

  if (!captain || captain.charters.length === 0) {
    return (
      <div className="px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Reviews
        </h1>
        <p className="mt-4 text-slate-600">
          You need to create a charter first before you can receive reviews.
        </p>
      </div>
    );
  }

  const charterIds = captain.charters.map((c) => c.id);

  // Fetch reviews and stats
  const [reviews, stats] = await Promise.all([
    getCaptainReviews(charterIds),
    getCaptainReviewStats(charterIds),
  ]);

  // Calculate badge summary
  const badgeSummary = summariseBadges(reviews);
  const totalBadgesCount = reviews.reduce(
    (sum, review) => sum + review.badges.length,
    0
  );

  return (
    <div className="px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Reviews
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Feedback from anglers who booked your charters
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Reviews */}
        <div className="p-6 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Reviews
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {stats.totalReviews}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Average Rating */}
        <div className="p-6 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Average Rating
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {stats.averageRating.toFixed(1)}
                <span className="ml-1 text-lg text-slate-500">/ 5.0</span>
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
        </div>

        {/* Total Badges */}
        <div className="p-6 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Total Badges</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {totalBadgesCount}
                <span className="ml-2 text-sm text-slate-500">
                  ({badgeSummary.length} types)
                </span>
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>

        {/* 5-Star Reviews */}
        <div className="p-6 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                5-Star Reviews
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {stats.ratingBreakdown[5]}
                <span className="ml-2 text-sm text-slate-500">
                  (
                  {stats.totalReviews > 0
                    ? Math.round(
                        (stats.ratingBreakdown[5] / stats.totalReviews) * 100
                      )
                    : 0}
                  %)
                </span>
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <span className="text-2xl">🌟</span>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="p-6 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {
                  reviews.filter((r) => {
                    const reviewDate = new Date(r.createdAt);
                    const now = new Date();
                    return (
                      reviewDate.getMonth() === now.getMonth() &&
                      reviewDate.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Breakdown */}
      {stats.totalReviews > 0 && (
        <div className="p-6 mb-8 bg-white border shadow-sm rounded-xl border-slate-200">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Rating Breakdown
          </h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.ratingBreakdown[rating] || 0;
              const percentage =
                stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-12 text-sm font-medium text-slate-600">
                    {rating} ⭐
                  </span>
                  <div className="flex-1">
                    <div className="w-full h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-16 text-sm text-right text-slate-600">
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges Breakdown */}
      {badgeSummary.length > 0 && (
        <div className="p-6 mb-8 bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Badges Earned
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Recognition badges from anglers
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-slate-50 border-slate-200">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalBadgesCount}
                </p>
                <p className="text-xs text-slate-600">Total badges</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badgeSummary.map(({ badge, count }) => (
              <div
                key={badge.id}
                className="flex items-center justify-between p-4 transition-shadow border rounded-lg border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100">
                    <span className="text-2xl">{badge.icon}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{badge.label}</p>
                    <p className="text-xs text-slate-500">
                      {badge.description}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-slate-100">
                  <span className="text-2xl font-bold text-slate-900">
                    {count}
                  </span>
                  <span className="text-xs text-slate-600">times</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <ReviewsList reviews={reviews.map(convertToBookingReview)} />
      ) : (
        <div className="p-12 text-center bg-white border shadow-sm rounded-xl border-slate-200">
          <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-slate-100">
            <Star className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No reviews yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            Reviews will appear here once anglers complete their trips and leave
            feedback.
          </p>
        </div>
      )}
    </div>
  );
}
