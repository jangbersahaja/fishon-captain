/**
 * Analytics API Client for fishon-captain
 *
 * Fetches analytics data from fishon-market API.
 * Used by captain dashboard to display performance metrics.
 */

export type TimePeriod = "7d" | "30d" | "90d" | "1y";

export interface CaptainAnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  bookingConversion: number;
  bookingStarts: number;
  bookingSubmits: number;
}

export interface TimeSeriesDataPoint {
  date: string;
  views: number;
  bookings: number;
  uniqueVisitors: number;
}

export interface ReferralSource {
  source: string;
  count: number;
  percentage: number;
}

export interface TopCharter {
  charterId: string;
  name: string;
  views: number;
  bookings: number;
  conversionRate: number;
}

export interface CaptainAnalytics {
  summary: CaptainAnalyticsSummary;
  timeSeries: TimeSeriesDataPoint[];
  referralSources: ReferralSource[];
  topCharters: TopCharter[];
}

export interface CharterViews {
  total: number;
  last30Days: number;
  uniqueVisitors: number;
}

export interface CharterEngagement {
  photoViews: number;
  videoViews: number;
  contactClicks: number;
  shareClicks: number;
  bookingStarts: number;
}

export interface CharterBookings {
  total: number;
  conversionRate: number;
}

export interface CharterAnalytics {
  views: CharterViews;
  engagement: CharterEngagement;
  bookings: CharterBookings;
  timeSeries: TimeSeriesDataPoint[];
  sources: ReferralSource[];
}

class AnalyticsApiClient {
  private baseUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_FISHON_MARKET_URL || "http://localhost:3001";
    this.apiKey = process.env.FISHON_MARKET_API_KEY;
  }

  private async fetchApi<T>(endpoint: string): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["x-api-key"] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers,
      // Don't cache analytics data - always fetch fresh
      cache: "no-store",
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));
      throw new Error(error.error || `Analytics API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Fetch analytics for a captain across all their charters
   *
   * @param captainId - The captain's ID from CaptainProfile
   * @param period - Time period: '7d', '30d', '90d', or '1y'
   * @returns Aggregated analytics data
   */
  async getCaptainAnalytics(
    captainId: string,
    period: TimePeriod = "30d"
  ): Promise<CaptainAnalytics> {
    return this.fetchApi<CaptainAnalytics>(
      `/api/captain/analytics?captainId=${captainId}&period=${period}`
    );
  }

  /**
   * Fetch analytics for a specific charter
   *
   * @param charterId - The charter's ID
   * @param period - Time period: '7d', '30d', '90d', or '1y'
   * @returns Charter-specific analytics data
   */
  async getCharterAnalytics(
    charterId: string,
    period: TimePeriod = "30d"
  ): Promise<CharterAnalytics> {
    return this.fetchApi<CharterAnalytics>(
      `/api/captain/analytics/charter/${charterId}?period=${period}`
    );
  }
}

// Export singleton instance
export const analyticsApi = new AnalyticsApiClient();

// Export class for testing
export { AnalyticsApiClient };
