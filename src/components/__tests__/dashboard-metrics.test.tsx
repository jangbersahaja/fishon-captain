import type { CharterPerformance } from "@/lib/charter-service";
import type { BookingStats } from "@/lib/services/booking-stats";
import type { EarningsSummary } from "@/lib/services/finance-service";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardMetricsGrid } from "../captain/DashboardMetricsGrid";

// Mock child components
vi.mock("../captain/BookingStatsCardsCompact", () => ({
  BookingStatsCardsCompact: ({
    bookingStats,
  }: {
    bookingStats: BookingStats;
  }) => (
    <div data-testid="booking-stats-cards">
      {bookingStats.requests} requests
    </div>
  ),
}));

vi.mock("../captain/EarningsOverviewCard", () => ({
  EarningsOverviewCard: ({
    earningsData,
  }: {
    earningsData: EarningsSummary;
  }) => <div data-testid="earnings-card">RM {earningsData.currentPeriod}</div>,
}));

vi.mock("../captain/AnalyticsStatsCard", () => ({
  AnalyticsStatsCard: ({
    analyticsData,
  }: {
    analyticsData: {
      views: number;
      visitors: number;
      conversionRate: number;
      requests: number;
    };
  }) => <div data-testid="analytics-card">{analyticsData.views} views</div>,
}));

vi.mock("../captain/CharterPerformanceCard", () => ({
  CharterPerformanceCard: ({
    charterPerformance,
  }: {
    charterPerformance: CharterPerformance[];
  }) => (
    <div data-testid="charter-performance-card">
      {charterPerformance.length} charters
    </div>
  ),
}));

describe("DashboardMetricsGrid", () => {
  const mockBookingStats: BookingStats = {
    requests: 3,
    upcoming: 5,
    completed: 12,
    cancellations: 1,
    totalValue: 2500,
  };

  const mockEarningsData: EarningsSummary = {
    currentPeriod: 5000,
    previousPeriod: 4500,
    percentChange: 11.11,
    pending: 1200,
    commissionRate: 10,
    nextPayoutDate: new Date("2025-12-05"),
  };

  const mockAnalyticsData = {
    views: 1250,
    visitors: 342,
    conversionRate: 2.5,
    requests: 3,
  };

  const mockCharterPerformance: CharterPerformance[] = [
    {
      id: "charter-1",
      name: "Sea Explorer",
      isActive: true,
      rating: 4.8,
      bookingCount: 12,
      mediaCount: 8,
      lastUpdated: new Date(),
    },
    {
      id: "charter-2",
      name: "Fishing Dreams",
      isActive: true,
      rating: 4.5,
      bookingCount: 8,
      mediaCount: 5,
      lastUpdated: new Date(),
    },
  ];

  it("should render all metric cards in correct order", () => {
    render(
      <DashboardMetricsGrid
        bookingStats={mockBookingStats}
        earningsData={mockEarningsData}
        analyticsData={mockAnalyticsData}
        charterPerformance={mockCharterPerformance}
      />
    );

    expect(screen.getByTestId("booking-stats-cards")).toBeInTheDocument();
    expect(screen.getByTestId("earnings-card")).toBeInTheDocument();
    expect(screen.getByTestId("analytics-card")).toBeInTheDocument();
    expect(screen.getByTestId("charter-performance-card")).toBeInTheDocument();
  });

  it("should pass correct props to child components", () => {
    render(
      <DashboardMetricsGrid
        bookingStats={mockBookingStats}
        earningsData={mockEarningsData}
        analyticsData={mockAnalyticsData}
        charterPerformance={mockCharterPerformance}
      />
    );

    expect(screen.getByText("3 requests")).toBeInTheDocument();
    expect(screen.getByText("RM 5000")).toBeInTheDocument();
    expect(screen.getByText("1250 views")).toBeInTheDocument();
    expect(screen.getByText("2 charters")).toBeInTheDocument();
  });

  it("should render with responsive grid classes", () => {
    const { container } = render(
      <DashboardMetricsGrid
        bookingStats={mockBookingStats}
        earningsData={mockEarningsData}
        analyticsData={mockAnalyticsData}
        charterPerformance={mockCharterPerformance}
      />
    );

    const gridElement = container.querySelector(".grid");
    expect(gridElement).toHaveClass(
      "grid-cols-1",
      "sm:grid-cols-2",
      "lg:grid-cols-3",
      "xl:grid-cols-4"
    );
    expect(gridElement).toHaveClass("gap-4");
  });
});
