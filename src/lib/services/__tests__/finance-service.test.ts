/**
 * Finance Service Tests
 * TDD tests for earnings and payout statistics
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getEarningsSummary } from "../finance-service";

// Mock both Prisma clients
vi.mock("@/lib/prisma", () => ({
  prisma: {
    charter: {
      findMany: vi.fn(),
    },
    payout: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma-market", () => ({
  prismaMarket: {
    booking: {
      findMany: vi.fn(),
    },
  },
  isMarketDbConfigured: vi.fn(() => true),
}));

import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";

describe("Finance Service", () => {
  const mockUserId = "user-123";
  const mockCaptainId = "captain-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEarningsSummary", () => {
    describe("period filtering and calculations", () => {
      it("should calculate earnings for current 30d period vs previous 30d", async () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(
          now.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const mockCharters = [
          {
            id: "c1",
            pricingPlan: "BASIC",
            ownerId: mockUserId,
          },
        ];

        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "PENDING",
          },
          {
            id: "b2",
            status: "PAID",
            createdAt: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
            finalPrice: 800,
            platformFee: 80,
            captainEarnings: 720,
            payoutStatus: "COMPLETED",
          },
        ];

        const mockPayouts = [
          {
            id: "p1",
            status: "COMPLETED",
            netPayout: 1000,
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts as any);

        const summary = await getEarningsSummary(mockUserId, "30d");

        expect(summary).toBeDefined();
        expect(summary.currentPeriod).toBeGreaterThanOrEqual(0);
        expect(summary.previousPeriod).toBeGreaterThanOrEqual(0);
        expect(summary.percentChange).toBeDefined();
        expect(summary.pending).toBeGreaterThanOrEqual(0);
      });

      it("should calculate earnings for 7d period", async () => {
        const now = new Date();
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
            finalPrice: 500,
            platformFee: 50,
            captainEarnings: 450,
            payoutStatus: "PENDING",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId, "7d");

        expect(summary.currentPeriod).toBeDefined();
        expect(summary.previousPeriod).toBeDefined();
      });

      it("should calculate earnings for 90d period", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId, "90d");

        expect(summary.currentPeriod).toBe(0);
        expect(summary.previousPeriod).toBe(0);
      });
    });

    describe("pending payouts", () => {
      it("should sum pending payout amounts from PENDING bookings", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(),
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "PENDING",
          },
          {
            id: "b2",
            status: "PAID",
            createdAt: new Date(),
            finalPrice: 500,
            platformFee: 50,
            captainEarnings: 450,
            payoutStatus: "PENDING",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.pending).toBe(1350); // 900 + 450
      });

      it("should exclude COMPLETED payouts from pending calculation", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(),
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "COMPLETED",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.pending).toBe(0);
      });
    });

    describe("percent change calculation", () => {
      it("should calculate positive percent change", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const now = new Date();

        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // This period
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "PENDING",
          },
          {
            id: "b2",
            status: "PAID",
            createdAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000), // Previous period
            finalPrice: 500,
            platformFee: 50,
            captainEarnings: 450,
            payoutStatus: "COMPLETED",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId, "30d");

        expect(summary.percentChange).toBeGreaterThan(0);
      });

      it("should calculate negative percent change", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const now = new Date();

        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // This period - low earnings
            finalPrice: 300,
            platformFee: 30,
            captainEarnings: 270,
            payoutStatus: "PENDING",
          },
          {
            id: "b2",
            status: "PAID",
            createdAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000), // Previous period - high earnings
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "COMPLETED",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId, "30d");

        expect(summary.percentChange).toBeLessThan(0);
      });

      it("should handle zero previous period (avoid division by zero)", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const now = new Date();

        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "PENDING",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId, "30d");

        // When previous period is 0 but current is > 0, should show 100 or Infinity indicator
        expect(typeof summary.percentChange).toBe("number");
      });
    });

    describe("commission rates by pricing plan", () => {
      it("should use 5% commission for GOLD plan", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "GOLD" }];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.commissionRate).toBe(0.05);
      });

      it("should use 8% commission for SILVER plan", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "SILVER" }];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.commissionRate).toBe(0.08);
      });

      it("should use 10% commission for BASIC plan", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.commissionRate).toBe(0.1);
      });

      it("should use lowest rate when captain has multiple charters with different plans", async () => {
        const mockCharters = [
          { id: "c1", pricingPlan: "BASIC" },
          { id: "c2", pricingPlan: "GOLD" },
          { id: "c3", pricingPlan: "SILVER" },
        ];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        // GOLD has lowest commission rate (5%)
        expect(summary.commissionRate).toBe(0.05);
      });
    });

    describe("next payout date", () => {
      it("should set nextPayoutDate when there are pending earnings", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(),
            finalPrice: 1000,
            platformFee: 100,
            captainEarnings: 900,
            payoutStatus: "PENDING",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.nextPayoutDate).not.toBeNull();
        expect(summary.nextPayoutDate).toBeInstanceOf(Date);
      });

      it("should not set nextPayoutDate when pending is zero", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings: any[] = [];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.nextPayoutDate).toBeNull();
      });
    });

    describe("edge cases", () => {
      it("should handle no charters gracefully", async () => {
        vi.mocked(prisma.charter.findMany).mockResolvedValue([]);
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue([]);
        vi.mocked(prisma.payout.findMany).mockResolvedValue([]);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.currentPeriod).toBe(0);
        expect(summary.previousPeriod).toBe(0);
        expect(summary.pending).toBe(0);
        expect(summary.commissionRate).toBe(0.1); // Default BASIC rate
      });

      it("should handle bookings with null/undefined earnings", async () => {
        const mockCharters = [{ id: "c1", pricingPlan: "BASIC" }];
        const mockBookings = [
          {
            id: "b1",
            status: "PAID",
            createdAt: new Date(),
            finalPrice: 1000,
            platformFee: null,
            captainEarnings: null,
            payoutStatus: "PENDING",
          },
        ];
        const mockPayouts: any[] = [];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
          mockBookings as any
        );
        vi.mocked(prisma.payout.findMany).mockResolvedValue(mockPayouts);

        const summary = await getEarningsSummary(mockUserId);

        expect(summary.pending).toBe(0);
      });
    });
  });
});
