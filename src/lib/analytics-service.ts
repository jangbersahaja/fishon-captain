/**
 * Analytics Service for fishon-captain
 *
 * Fetches analytics data using two strategies:
 * 1. Direct DB access (primary) - Fast, efficient Prisma queries
 * 2. API fallback (secondary) - When DB connection fails
 *
 * Benefits of direct DB:
 * - Faster queries (no HTTP overhead)
 * - Better aggregations (PostgreSQL native)
 * - Type-safe with Prisma
 * - Consistent with booking service pattern
 */

import { prismaMarket } from "@/lib/prisma-market";
import type {
  CaptainAnalytics,
  CharterAnalytics,
  ReferralSource,
  TimeSeriesDataPoint,
  TopCharter,
} from "./analytics-api";
import { analyticsApi, type TimePeriod } from "./analytics-api";

// Type for analytics events from database
type AnalyticsEvent = {
  id: string;
  eventType: string;
  charterId: string | null;
  captainId: string | null;
  userId: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
  referrer: string | null;
  source: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

// Strategy flags
const USE_DIRECT_DB = process.env.USE_ANALYTICS_DB === "1";
const FALLBACK_TO_API = true;

/**
 * Get start date based on time period
 */
function getStartDate(period: TimePeriod): Date {
  const now = new Date();
  const start = new Date(now);

  switch (period) {
    case "7d":
      start.setDate(now.getDate() - 7);
      break;
    case "30d":
      start.setDate(now.getDate() - 30);
      break;
    case "90d":
      start.setDate(now.getDate() - 90);
      break;
    case "1y":
      start.setFullYear(now.getFullYear() - 1);
      break;
  }

  return start;
}

/**
 * Detect traffic source from referrer
 */
function detectSource(referrer: string | null): string {
  if (!referrer) return "direct";

  const url = referrer.toLowerCase();
  if (url.includes("google") || url.includes("bing") || url.includes("yahoo"))
    return "search";
  if (
    url.includes("facebook") ||
    url.includes("instagram") ||
    url.includes("twitter") ||
    url.includes("tiktok")
  )
    return "social";
  if (url.includes("fishon.my")) return "direct";

  return "referral";
}

/**
 * Get charter analytics using direct database access
 */
async function getCharterAnalyticsFromDB(
  charterId: string,
  period: TimePeriod
): Promise<CharterAnalytics> {
  const startDate = getStartDate(period);

  // Fetch all events for this charter in the period
  const events = (await prismaMarket.analyticsEvent.findMany({
    where: {
      charterId,
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: "asc" },
  })) as AnalyticsEvent[];

  // Calculate views
  const charterViews = events.filter((e) => e.eventType === "CHARTER_VIEW");
  const total = charterViews.length;
  const uniqueVisitors = new Set(
    charterViews
      .map((e) => e.sessionId || e.userId || e.ipAddress)
      .filter(Boolean)
  ).size;

  // Last 30 days for comparison
  const last30DaysStart = new Date();
  last30DaysStart.setDate(last30DaysStart.getDate() - 30);
  const last30Days = charterViews.filter(
    (e) => e.createdAt >= last30DaysStart
  ).length;

  // Calculate engagement
  const photoViews = events.filter((e) => e.eventType === "PHOTO_VIEW").length;
  const videoViews = events.filter((e) => e.eventType === "VIDEO_VIEW").length;
  const contactClicks = events.filter(
    (e) => e.eventType === "CONTACT_CLICK"
  ).length;
  const shareClicks = events.filter(
    (e) => e.eventType === "SHARE_CLICKED"
  ).length;
  const bookingStarts = events.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;

  // Calculate bookings
  const bookingSubmits = events.filter(
    (e) => e.eventType === "BOOKING_SUBMITTED"
  ).length;
  const conversionRate = total > 0 ? (bookingSubmits / total) * 100 : 0;

  // Generate time series
  const timeSeries: TimeSeriesDataPoint[] = [];
  const daysMap = new Map<
    string,
    { views: number; bookings: number; visitors: Set<string> }
  >();

  events.forEach((event) => {
    const date = event.createdAt.toISOString().split("T")[0];

    if (!daysMap.has(date)) {
      daysMap.set(date, { views: 0, bookings: 0, visitors: new Set() });
    }

    const dayData = daysMap.get(date)!;

    if (event.eventType === "CHARTER_VIEW") {
      dayData.views++;
      const visitorId = event.sessionId || event.userId || event.ipAddress;
      if (visitorId) dayData.visitors.add(visitorId);
    }

    if (event.eventType === "BOOKING_SUBMITTED") {
      dayData.bookings++;
    }
  });

  daysMap.forEach((data, date) => {
    timeSeries.push({
      date,
      views: data.views,
      bookings: data.bookings,
      uniqueVisitors: data.visitors.size,
    });
  });

  // Calculate sources
  const sourceMap = new Map<string, number>();
  let totalSourcedViews = 0;

  charterViews.forEach((event) => {
    const source = event.source || detectSource(event.referrer);
    sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
    totalSourcedViews++;
  });

  const sources: ReferralSource[] = Array.from(sourceMap.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalSourcedViews > 0 ? (count / totalSourcedViews) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    views: {
      total,
      last30Days,
      uniqueVisitors,
    },
    engagement: {
      photoViews,
      videoViews,
      contactClicks,
      shareClicks,
      bookingStarts,
    },
    bookings: {
      total: bookingSubmits,
      conversionRate,
    },
    timeSeries,
    sources,
  };
}

/**
 * Get charter analytics with automatic fallback
 */
export async function getCharterAnalytics(
  charterId: string,
  period: TimePeriod = "30d"
): Promise<CharterAnalytics> {
  console.log(
    `[Analytics] Fetching charter analytics for ${charterId}, period: ${period}`
  );

  if (USE_DIRECT_DB) {
    try {
      console.log("[Analytics] Using direct DB access for charter...");
      return await getCharterAnalyticsFromDB(charterId, period);
    } catch (error) {
      console.error(
        "[Analytics] Direct DB failed:",
        error instanceof Error ? error.message : error
      );

      if (FALLBACK_TO_API) {
        console.log("[Analytics] Attempting API fallback for charter...");
        try {
          return await analyticsApi.getCharterAnalytics(charterId, period);
        } catch (apiError) {
          console.error(
            "[Analytics] API fallback also failed:",
            apiError instanceof Error ? apiError.message : apiError
          );
          return getEmptyCharterAnalytics();
        }
      }

      return getEmptyCharterAnalytics();
    }
  }

  // Use API as primary
  console.log("[Analytics] Using API as primary for charter...");
  try {
    return await analyticsApi.getCharterAnalytics(charterId, period);
  } catch (apiError) {
    console.error(
      "[Analytics] API request failed for charter:",
      apiError instanceof Error ? apiError.message : apiError
    );

    if (process.env.MARKET_DATABASE_URL) {
      console.log(
        "[Analytics] API failed, attempting DB as fallback for charter..."
      );
      try {
        return await getCharterAnalyticsFromDB(charterId, period);
      } catch (dbError) {
        console.error(
          "[Analytics] DB fallback also failed:",
          dbError instanceof Error ? dbError.message : dbError
        );
      }
    }

    return getEmptyCharterAnalytics();
  }
}

/**
 * Get empty charter analytics structure when no data is available
 */
function getEmptyCharterAnalytics(): CharterAnalytics {
  return {
    views: {
      total: 0,
      last30Days: 0,
      uniqueVisitors: 0,
    },
    engagement: {
      photoViews: 0,
      videoViews: 0,
      contactClicks: 0,
      shareClicks: 0,
      bookingStarts: 0,
    },
    bookings: {
      total: 0,
      conversionRate: 0,
    },
    timeSeries: [],
    sources: [],
  };
}

/**
 * Get owner analytics using direct database access
 * Aggregates analytics across all charters owned by a user
 */
async function getOwnerAnalyticsFromDB(
  ownerId: string,
  period: TimePeriod
): Promise<CaptainAnalytics> {
  const startDate = getStartDate(period);

  // Fetch all events for charters owned by this user
  const events = (await prismaMarket.analyticsEvent.findMany({
    where: {
      ownerId,
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  })) as AnalyticsEvent[];

  // Calculate summary metrics
  const totalViews = events.filter(
    (e) => e.eventType === "CHARTER_VIEW"
  ).length;
  const uniqueVisitors = new Set(events.map((e) => e.sessionId)).size;
  const bookingStarts = events.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;
  const bookingSubmits = events.filter(
    (e) => e.eventType === "BOOKING_SUBMITTED"
  ).length;
  const bookingConversion =
    totalViews > 0 ? (bookingSubmits / totalViews) * 100 : 0;

  // Build time series (daily aggregation)
  const timeSeriesMap = new Map<string, TimeSeriesDataPoint>();
  events.forEach((event) => {
    const dateKey = event.createdAt.toISOString().split("T")[0];
    const existing = timeSeriesMap.get(dateKey) || {
      date: dateKey,
      views: 0,
      bookings: 0,
      uniqueVisitors: 0,
    };

    if (event.eventType === "CHARTER_VIEW") existing.views++;
    if (event.eventType === "BOOKING_SUBMITTED") existing.bookings++;

    timeSeriesMap.set(dateKey, existing);
  });

  // Calculate unique visitors per day
  const sessionsByDate = new Map<string, Set<string>>();
  events.forEach((event) => {
    const dateKey = event.createdAt.toISOString().split("T")[0];
    if (!sessionsByDate.has(dateKey)) {
      sessionsByDate.set(dateKey, new Set());
    }
    if (event.sessionId) {
      sessionsByDate.get(dateKey)!.add(event.sessionId);
    }
  });

  sessionsByDate.forEach((sessions, date) => {
    const point = timeSeriesMap.get(date);
    if (point) {
      point.uniqueVisitors = sessions.size;
    }
  });

  const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  // Build referral sources
  const sourceCounts = new Map<string, number>();
  events.forEach((event) => {
    const source = detectSource(event.referrer);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  const totalEvents = events.length;
  const referralSources: ReferralSource[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: (count / totalEvents) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Get top charters by views
  const charterViews = new Map<string, { views: number; bookings: number }>();
  events.forEach((event) => {
    if (event.charterId) {
      const existing = charterViews.get(event.charterId) || {
        views: 0,
        bookings: 0,
      };
      if (event.eventType === "CHARTER_VIEW") existing.views++;
      if (event.eventType === "BOOKING_SUBMITTED") existing.bookings++;
      charterViews.set(event.charterId, existing);
    }
  });

  // Note: We don't have charter names in analytics events
  // This would require joining with Charter table
  const topCharters: TopCharter[] = Array.from(charterViews.entries())
    .map(([charterId, stats]) => ({
      charterId,
      name: `Charter ${charterId.slice(0, 8)}`, // Abbreviated ID as fallback
      views: stats.views,
      bookings: stats.bookings,
      conversionRate:
        stats.views > 0 ? (stats.bookings / stats.views) * 100 : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  return {
    summary: {
      totalViews,
      uniqueVisitors,
      bookingConversion,
      bookingStarts,
      bookingSubmits,
    },
    timeSeries,
    referralSources,
    topCharters,
  };
}

/**
 * Get empty analytics structure when no data is available
 */
function getEmptyAnalytics(): CaptainAnalytics {
  return {
    summary: {
      totalViews: 0,
      uniqueVisitors: 0,
      bookingConversion: 0,
      bookingStarts: 0,
      bookingSubmits: 0,
    },
    timeSeries: [],
    referralSources: [],
    topCharters: [],
  };
}

/**
 * Get owner analytics with automatic fallback
 * Fetches analytics for all charters owned by a user
 */
export async function getOwnerAnalytics(
  ownerId: string,
  period: TimePeriod = "30d"
): Promise<CaptainAnalytics> {
  console.log(
    `[Analytics] Fetching owner analytics for ${ownerId}, period: ${period}`
  );

  if (USE_DIRECT_DB) {
    try {
      console.log("[Analytics] Using direct DB access for owner...");
      return await getOwnerAnalyticsFromDB(ownerId, period);
    } catch (error) {
      console.error(
        "[Analytics] Direct DB failed:",
        error instanceof Error ? error.message : error
      );
      return getEmptyAnalytics();
    }
  }

  // No API endpoint for owner analytics yet, return empty
  console.log("[Analytics] Owner analytics requires direct DB access");
  return getEmptyAnalytics();
}
