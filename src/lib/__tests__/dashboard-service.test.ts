/**
 * Dashboard Service Tests
 * TDD tests for complete dashboard data aggregation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "../dashboard-service";

// Mock all services
vi.mock("@/lib/services/booking-stats", () => ({
  getBookingStats: vi.fn(),
}));

vi.mock("@/lib/services/finance-service", () => ({
  getEarningsSummary: vi.fn(),
}));

vi.mock("@/lib/charter-service", () => ({
  getCharterPerformance: vi.fn(),
}));

vi.mock("@/lib/booking-priority", () => ({
  getPriorityBookings: vi.fn(),
}));

vi.mock("@/lib/booking-service", () => ({
  getCaptainBookings: vi.fn(),
}));

vi.mock("@/lib/services/verification-status", () => ({
  getVerificationStatus: vi.fn(),
}));

vi.mock("@/lib/services/system-messages", () => ({
  generateSystemMessages: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    captainProfile: {
      findUnique: vi.fn(),
    },
    captainVerification: {
      findUnique: vi.fn(),
    },
  },
}));

import { getPriorityBookings } from "@/lib/booking-priority";
import { getCaptainBookings } from "@/lib/booking-service";
import { getCharterPerformance } from "@/lib/charter-service";
import { prisma } from "@/lib/prisma";
import { getBookingStats } from "@/lib/services/booking-stats";
import { getEarningsSummary } from "@/lib/services/finance-service";
import { generateSystemMessages } from "@/lib/services/system-messages";
import { getVerificationStatus } from "@/lib/services/verification-status";

describe("Dashboard Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks for new services
    vi.mocked(getVerificationStatus).mockResolvedValue(null);
    vi.mocked(generateSystemMessages).mockResolvedValue([]);
  });

  describe("getDashboardData", () => {
    describe("data aggregation", () => {
      it("should aggregate all dashboard data sources", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John Doe",
          charters: [{ id: "charter-1" }, { id: "charter-2" }],
        };

        const mockBookingStats = {
          requests: 2,
          upcoming: 5,
          completed: 10,
          cancellations: 1,
          totalValue: 5000,
        };

        const mockEarnings = {
          currentPeriod: 1000,
          previousPeriod: 800,
          percentChange: 25,
          pending: 500,
          nextPayoutDate: new Date(),
          commissionRate: 0.1,
        };

        const mockCharterPerformance = [
          {
            id: "c1",
            name: "Charter 1",
            isActive: true,
            rating: 4.5,
            bookingCount: 10,
            mediaCount: 5,
            lastUpdated: new Date(),
          },
        ];

        const mockPriorityBookings = [
          {
            id: "b1",
            type: "new-request" as const,
            urgency: "high" as const,
            booking: {},
            action: "Review Request",
          },
        ];

        const mockBookings = [
          {
            id: "b1",
            status: "PENDING",
            createdAt: new Date(),
          },
        ];

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue(mockBookingStats);
        vi.mocked(getEarningsSummary).mockResolvedValue(mockEarnings as any);
        vi.mocked(getCharterPerformance).mockResolvedValue(
          mockCharterPerformance as any
        );
        vi.mocked(getCaptainBookings).mockResolvedValue(mockBookings as any);
        vi.mocked(getPriorityBookings).mockReturnValue(
          mockPriorityBookings as any
        );

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard).toBeDefined();
        expect(dashboard.profile).toBeDefined();
        expect(dashboard.bookingStats).toBeDefined();
        expect(dashboard.earningsData).toBeDefined();
        expect(dashboard.charterPerformance).toBeDefined();
        expect(dashboard.priorityBookings).toBeDefined();
      });

      it("should support different time periods", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John Doe",
          charters: [{ id: "charter-1" }],
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 1,
          upcoming: 2,
          completed: 5,
          cancellations: 0,
          totalValue: 2000,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 500,
          previousPeriod: 400,
          percentChange: 25,
          pending: 200,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard7d = await getDashboardData(mockUserId, "7d");
        const dashboard30d = await getDashboardData(mockUserId, "30d");
        const dashboard90d = await getDashboardData(mockUserId, "90d");

        expect(dashboard7d).toBeDefined();
        expect(dashboard30d).toBeDefined();
        expect(dashboard90d).toBeDefined();
      });
    });

    describe("profile data", () => {
      it("should include captain profile with display name", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "Captain John",
          charters: [{ id: "charter-1" }],
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard.profile).toEqual(mockProfile);
        expect(dashboard.profile.displayName).toBe("Captain John");
      });

      it("should handle missing profile gracefully", async () => {
        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(null);
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard).toBeDefined();
      });
    });

    describe("booking stats", () => {
      it("should include all booking stat fields", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [{ id: "charter-1" }],
        };

        const mockStats = {
          requests: 3,
          upcoming: 7,
          completed: 15,
          cancellations: 2,
          totalValue: 7500,
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue(mockStats);
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard.bookingStats).toEqual(mockStats);
        expect(dashboard.bookingStats.requests).toBe(3);
        expect(dashboard.bookingStats.totalValue).toBe(7500);
      });
    });

    describe("earnings data", () => {
      it("should include earnings summary", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [{ id: "charter-1" }],
        };

        const mockEarnings = {
          currentPeriod: 2000,
          previousPeriod: 1500,
          percentChange: 33.33,
          pending: 800,
          nextPayoutDate: new Date("2025-12-01"),
          commissionRate: 0.08,
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue(mockEarnings as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard.earningsData).toEqual(mockEarnings);
        expect(dashboard.earningsData.currentPeriod).toBe(2000);
        expect(dashboard.earningsData.percentChange).toBe(33.33);
      });
    });

    describe("charter performance", () => {
      it("should include array of charter performance data", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [{ id: "charter-1" }, { id: "charter-2" }],
        };

        const mockCharters = [
          {
            id: "c1",
            name: "Deep Sea Charter",
            isActive: true,
            rating: 4.8,
            bookingCount: 25,
            mediaCount: 12,
            lastUpdated: new Date(),
          },
          {
            id: "c2",
            name: "Bay Fishing",
            isActive: true,
            rating: 4.2,
            bookingCount: 18,
            mediaCount: 8,
            lastUpdated: new Date(),
          },
        ];

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue(mockCharters as any);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(Array.isArray(dashboard.charterPerformance)).toBe(true);
        expect(dashboard.charterPerformance).toHaveLength(2);
        expect(dashboard.charterPerformance[0].name).toBe("Deep Sea Charter");
        expect(dashboard.charterPerformance[0].bookingCount).toBe(25);
      });

      it("should handle empty charter list", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [],
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard.charterPerformance).toEqual([]);
      });
    });

    describe("priority bookings", () => {
      it("should include priority bookings array", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [{ id: "charter-1" }],
        };

        const mockPriority = [
          {
            id: "b1",
            type: "new-request",
            urgency: "high",
            booking: { id: "b1", status: "PENDING" },
            action: "Review Request",
          },
          {
            id: "b2",
            type: "upcoming-trip",
            urgency: "medium",
            booking: { id: "b2", status: "PAID" },
            action: "Prepare Trip",
          },
        ];

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue(mockPriority as any);

        const dashboard = await getDashboardData(mockUserId);

        expect(Array.isArray(dashboard.priorityBookings)).toBe(true);
        expect(dashboard.priorityBookings).toHaveLength(2);
        expect(dashboard.priorityBookings[0].urgency).toBe("high");
      });
    });

    describe("edge cases", () => {
      it("should handle new captain with no data", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [],
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        const dashboard = await getDashboardData(mockUserId);

        expect(dashboard.bookingStats.totalValue).toBe(0);
        expect(dashboard.charterPerformance).toHaveLength(0);
        expect(dashboard.priorityBookings).toHaveLength(0);
      });

      it("should pass correct period to services", async () => {
        const mockProfile = {
          id: "profile-1",
          userId: mockUserId,
          firstName: "John",
          lastName: "Doe",
          displayName: "John",
          charters: [{ id: "charter-1" }],
        };

        vi.mocked(prisma.captainProfile.findUnique).mockResolvedValue(
          mockProfile as any
        );
        vi.mocked(getBookingStats).mockResolvedValue({
          requests: 0,
          upcoming: 0,
          completed: 0,
          cancellations: 0,
          totalValue: 0,
        });
        vi.mocked(getEarningsSummary).mockResolvedValue({
          currentPeriod: 0,
          previousPeriod: 0,
          percentChange: 0,
          pending: 0,
          nextPayoutDate: null,
          commissionRate: 0.1,
        } as any);
        vi.mocked(getCharterPerformance).mockResolvedValue([]);
        vi.mocked(getCaptainBookings).mockResolvedValue([]);
        vi.mocked(getPriorityBookings).mockReturnValue([]);

        await getDashboardData(mockUserId, "90d");

        expect(getBookingStats).toHaveBeenCalledWith(mockUserId, "90d");
        expect(getEarningsSummary).toHaveBeenCalledWith(mockUserId, "90d");
      });
    });
  });
});
