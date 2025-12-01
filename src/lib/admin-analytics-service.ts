/**
 * Admin Analytics Service for fishon-captain
 *
 * Fetches platform-wide analytics data for admin dashboard.
 * Aggregates analytics across ALL charters for platform monitoring.
 *
 * Uses direct DB access to fishon-market's analytics_events table.
 */

import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import type {
  ReferralSource,
  TimePeriod,
  TimeSeriesDataPoint,
} from "./analytics-api";

// Type for analytics events from database
type AnalyticsEvent = {
  id: string;
  eventType: string;
  charterId: string | null;
  ownerId: string | null;
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

/**
 * Platform-wide analytics summary
 */
export interface PlatformAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  totalBookingStarts: number;
  totalBookingSubmits: number;
  overallConversionRate: number;
  photoViews: number;
  videoViews: number;
  contactClicks: number;
  shareClicks: number;
}

/**
 * Event type breakdown for pie chart
 */
export interface EventTypeBreakdown {
  eventType: string;
  count: number;
  percentage: number;
}

/**
 * Charter performance for platform-wide view
 */
export interface CharterPerformance {
  charterId: string;
  charterName: string;
  ownerName: string;
  views: number;
  uniqueVisitors: number;
  bookingStarts: number;
  bookingSubmits: number;
  conversionRate: number;
  photoViews: number;
  videoViews: number;
}

/**
 * Complete platform analytics response
 */
export interface PlatformAnalytics {
  summary: PlatformAnalyticsSummary;
  timeSeries: TimeSeriesDataPoint[];
  referralSources: ReferralSource[];
  eventTypeBreakdown: EventTypeBreakdown[];
  topCharters: CharterPerformance[];
  totalCharters: number;
  activeCharters: number;
}

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
 * Get platform-wide analytics for all charters
 * This is the main function for the admin analytics dashboard
 */
export async function getPlatformAnalytics(
  period: TimePeriod = "30d"
): Promise<PlatformAnalytics> {
  const startDate = getStartDate(period);

  console.log(
    `[Admin Analytics] Fetching platform analytics for period: ${period}`
  );

  // Fetch all events in the period
  const events = (await prismaMarket.analyticsEvent.findMany({
    where: {
      createdAt: { gte: startDate },
    },
    orderBy: { createdAt: "asc" },
  })) as AnalyticsEvent[];

  console.log(`[Admin Analytics] Found ${events.length} events`);

  // Calculate summary metrics
  const charterViews = events.filter((e) => e.eventType === "CHARTER_VIEW");
  const totalViews = charterViews.length;
  const uniqueVisitors = new Set(events.map((e) => e.sessionId).filter(Boolean))
    .size;
  const totalBookingStarts = events.filter(
    (e) => e.eventType === "BOOKING_STARTED"
  ).length;
  const totalBookingSubmits = events.filter(
    (e) => e.eventType === "BOOKING_SUBMITTED"
  ).length;
  const overallConversionRate =
    totalViews > 0 ? (totalBookingSubmits / totalViews) * 100 : 0;
  const photoViews = events.filter((e) => e.eventType === "PHOTO_VIEW").length;
  const videoViews = events.filter((e) => e.eventType === "VIDEO_VIEW").length;
  const contactClicks = events.filter(
    (e) => e.eventType === "CONTACT_CLICK"
  ).length;
  const shareClicks = events.filter(
    (e) => e.eventType === "SHARE_CLICKED"
  ).length;

  // Build time series (daily aggregation)
  const timeSeriesMap = new Map<
    string,
    { views: number; bookings: number; visitors: Set<string> }
  >();

  events.forEach((event) => {
    const dateKey = event.createdAt.toISOString().split("T")[0];
    const existing = timeSeriesMap.get(dateKey) || {
      views: 0,
      bookings: 0,
      visitors: new Set<string>(),
    };

    if (event.eventType === "CHARTER_VIEW") {
      existing.views++;
    }
    if (event.eventType === "BOOKING_SUBMITTED") {
      existing.bookings++;
    }
    if (event.sessionId) {
      existing.visitors.add(event.sessionId);
    }

    timeSeriesMap.set(dateKey, existing);
  });

  const timeSeries: TimeSeriesDataPoint[] = Array.from(
    timeSeriesMap.entries()
  ).map(([date, data]) => ({
    date,
    views: data.views,
    bookings: data.bookings,
    uniqueVisitors: data.visitors.size,
  }));

  // Sort time series by date
  timeSeries.sort((a, b) => a.date.localeCompare(b.date));

  // Build referral sources
  const sourceCounts = new Map<string, number>();
  charterViews.forEach((event) => {
    const source = event.source || detectSource(event.referrer);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
  });

  const totalSourcedViews = totalViews;
  const referralSources: ReferralSource[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: totalSourcedViews > 0 ? (count / totalSourcedViews) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Build event type breakdown
  const eventTypeCounts = new Map<string, number>();
  events.forEach((event) => {
    eventTypeCounts.set(
      event.eventType,
      (eventTypeCounts.get(event.eventType) || 0) + 1
    );
  });

  const totalEvents = events.length;
  const eventTypeBreakdown: EventTypeBreakdown[] = Array.from(
    eventTypeCounts.entries()
  )
    .map(([eventType, count]) => ({
      eventType,
      count,
      percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Get top charters by views
  const charterStats = new Map<
    string,
    {
      views: number;
      visitors: Set<string>;
      bookingStarts: number;
      bookingSubmits: number;
      photoViews: number;
      videoViews: number;
    }
  >();

  events.forEach((event) => {
    if (!event.charterId) return;

    const existing = charterStats.get(event.charterId) || {
      views: 0,
      visitors: new Set<string>(),
      bookingStarts: 0,
      bookingSubmits: 0,
      photoViews: 0,
      videoViews: 0,
    };

    if (event.eventType === "CHARTER_VIEW") {
      existing.views++;
      if (event.sessionId) existing.visitors.add(event.sessionId);
    }
    if (event.eventType === "BOOKING_STARTED") existing.bookingStarts++;
    if (event.eventType === "BOOKING_SUBMITTED") existing.bookingSubmits++;
    if (event.eventType === "PHOTO_VIEW") existing.photoViews++;
    if (event.eventType === "VIDEO_VIEW") existing.videoViews++;

    charterStats.set(event.charterId, existing);
  });

  // Get charter IDs that have analytics data
  const charterIds = Array.from(charterStats.keys());

  // Fetch charter details (name, owner) from captain database
  const charterDetails = await prisma.charter.findMany({
    where: {
      id: { in: charterIds },
    },
    select: {
      id: true,
      name: true,
      owner: {
        select: {
          name: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Create a lookup map for charter details
  const charterLookup = new Map(
    charterDetails.map((c) => [
      c.id,
      {
        name: c.name,
        ownerName: c.owner
          ? c.owner.name ||
            [c.owner.firstName, c.owner.lastName].filter(Boolean).join(" ") ||
            "No Name"
          : "No Owner",
      },
    ])
  );

  // Build top charters with actual names from database
  const topCharters: CharterPerformance[] = Array.from(charterStats.entries())
    .map(([charterId, stats]) => {
      const details = charterLookup.get(charterId);
      return {
        charterId,
        charterName: details?.name || `Charter ${charterId.slice(0, 8)}...`,
        ownerName: details?.ownerName || "Unknown",
        views: stats.views,
        uniqueVisitors: stats.visitors.size,
        bookingStarts: stats.bookingStarts,
        bookingSubmits: stats.bookingSubmits,
        conversionRate:
          stats.views > 0 ? (stats.bookingSubmits / stats.views) * 100 : 0,
        photoViews: stats.photoViews,
        videoViews: stats.videoViews,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 20); // Top 20 charters

  // Count unique charters with activity
  const activeCharters = charterStats.size;
  const totalCharters = charterStats.size; // Will be enhanced with actual charter count

  return {
    summary: {
      totalViews,
      uniqueVisitors,
      totalBookingStarts,
      totalBookingSubmits,
      overallConversionRate,
      photoViews,
      videoViews,
      contactClicks,
      shareClicks,
    },
    timeSeries,
    referralSources,
    eventTypeBreakdown,
    topCharters,
    totalCharters,
    activeCharters,
  };
}

/**
 * Get empty platform analytics structure
 */
export function getEmptyPlatformAnalytics(): PlatformAnalytics {
  return {
    summary: {
      totalViews: 0,
      uniqueVisitors: 0,
      totalBookingStarts: 0,
      totalBookingSubmits: 0,
      overallConversionRate: 0,
      photoViews: 0,
      videoViews: 0,
      contactClicks: 0,
      shareClicks: 0,
    },
    timeSeries: [],
    referralSources: [],
    eventTypeBreakdown: [],
    topCharters: [],
    totalCharters: 0,
    activeCharters: 0,
  };
}
