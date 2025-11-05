/**
 * Review service for Captain app
 *
 * Provides read-only access to review data from Market DB.
 * All reviews are managed in fishon-market and read here for display.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { isMarketDbConfigured, prismaMarket } from "./prisma-market";

export type MarketReview = {
  id: string;
  userId: string;
  bookingId: string;
  captainCharterId: string; // Charter ID in captain database
  charterName: string;
  overallRating: number; // 1-5 stars
  badges: string[]; // ReviewBadgeId array
  comment: string | null;
  photos: string[]; // Blob URLs
  videos: string[]; // Blob URLs
  approved: boolean;
  published: boolean;
  tripDate: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

/**
 * Get all published reviews for a specific charter
 * @param charterId - Charter ID from captain database
 * @returns Array of published reviews with user info
 */
export async function getCharterReviews(
  charterId: string
): Promise<MarketReview[]> {
  if (!isMarketDbConfigured()) {
    console.warn(
      "Market DB not configured. Set MARKET_DATABASE_URL to enable review features."
    );
    return [];
  }

  try {
    const reviews = await prismaMarket.review.findMany({
      where: {
        captainCharterId: charterId,
        published: true, // Only show published reviews
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews as MarketReview[];
  } catch (error) {
    console.error(`Error fetching reviews for charter ${charterId}:`, error);
    throw new Error(
      "Failed to fetch reviews. Please check Market DB connection."
    );
  }
}

/**
 * Get all published reviews for a captain's charters
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Array of published reviews with user info
 */
export async function getCaptainReviews(
  charterIds: string[]
): Promise<MarketReview[]> {
  if (!isMarketDbConfigured()) {
    console.warn(
      "Market DB not configured. Set MARKET_DATABASE_URL to enable review features."
    );
    return [];
  }

  if (!charterIds.length) {
    return [];
  }

  try {
    const reviews = await prismaMarket.review.findMany({
      where: {
        captainCharterId: {
          in: charterIds,
        },
        published: true, // Only show published reviews
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews as MarketReview[];
  } catch (error) {
    console.error("Error fetching captain reviews:", error);
    throw new Error(
      "Failed to fetch reviews. Please check Market DB connection."
    );
  }
}

/**
 * Get review statistics for a captain's charters
 * @param charterIds - Array of charter IDs owned by the captain
 * @returns Review statistics
 */
export async function getCaptainReviewStats(charterIds: string[]): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>; // { 5: 10, 4: 5, 3: 2, 2: 1, 1: 0 }
  recentReviews: MarketReview[];
}> {
  if (!isMarketDbConfigured() || !charterIds.length) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      recentReviews: [],
    };
  }

  try {
    const reviews = await prismaMarket.review.findMany({
      where: {
        captainCharterId: {
          in: charterIds,
        },
        published: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        recentReviews: [],
      };
    }

    // Calculate average rating
    const sumRatings = reviews.reduce(
      (sum: number, r: any) => sum + r.overallRating,
      0
    );
    const averageRating = sumRatings / reviews.length;

    // Rating breakdown
    const ratingBreakdown: Record<number, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    reviews.forEach((r: any) => {
      ratingBreakdown[r.overallRating] =
        (ratingBreakdown[r.overallRating] || 0) + 1;
    });

    // Get 5 most recent reviews
    const recentReviews = reviews.slice(0, 5) as MarketReview[];

    return {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      ratingBreakdown,
      recentReviews,
    };
  } catch (error) {
    console.error("Error calculating review stats:", error);
    throw new Error(
      "Failed to calculate review statistics. Please check Market DB connection."
    );
  }
}

/**
 * Get review statistics for a specific charter
 * @param charterId - Charter ID from captain database
 * @returns Review statistics for the charter
 */
export async function getCharterReviewStats(charterId: string): Promise<{
  totalReviews: number;
  averageRating: number;
  ratingBreakdown: Record<number, number>;
  badgeSummary: Array<{ badgeId: string; count: number }>;
}> {
  if (!isMarketDbConfigured()) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      badgeSummary: [],
    };
  }

  try {
    const reviews = await prismaMarket.review.findMany({
      where: {
        captainCharterId: charterId,
        published: true,
      },
    });

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        badgeSummary: [],
      };
    }

    // Calculate average rating
    const sumRatings = reviews.reduce(
      (sum: number, r: any) => sum + r.overallRating,
      0
    );
    const averageRating = sumRatings / reviews.length;

    // Rating breakdown
    const ratingBreakdown: Record<number, number> = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    reviews.forEach((r: any) => {
      ratingBreakdown[r.overallRating] =
        (ratingBreakdown[r.overallRating] || 0) + 1;
    });

    // Badge frequency summary
    const badgeCount = new Map<string, number>();
    reviews.forEach((review: any) => {
      review.badges.forEach((badgeId: string) => {
        badgeCount.set(badgeId, (badgeCount.get(badgeId) || 0) + 1);
      });
    });

    const badgeSummary = Array.from(badgeCount.entries())
      .map(([badgeId, count]) => ({ badgeId, count }))
      .sort((a, b) => b.count - a.count); // Sort by frequency

    return {
      totalReviews: reviews.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingBreakdown,
      badgeSummary,
    };
  } catch (error) {
    console.error(`Error calculating stats for charter ${charterId}:`, error);
    throw new Error(
      "Failed to calculate review statistics. Please check Market DB connection."
    );
  }
}
