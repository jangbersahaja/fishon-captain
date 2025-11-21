/**
 * Booking Stats Service Tests
 * TDD tests for dashboard booking statistics aggregation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBookingStats } from "../services/booking-stats";

// Mock both Prisma clients
vi.mock("@/lib/prisma", () => ({
  prisma: {
    charter: {
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

describe("getBookingStats", () => {
  const mockUserId = "user-123";
  const mockCharterIds = ["c1", "c2"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("period filtering", () => {
    it("should calculate stats for 7d period", async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const mockCharters = [{ id: "c1" }, { id: "c2" }];

      const mockBookings = [
        {
          id: "b1",
          status: "PENDING",
          createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          finalPrice: 500,
          date: now,
        },
        {
          id: "b2",
          status: "PAID",
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          finalPrice: 1000,
          date: now,
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "7d");

      expect(stats).toBeDefined();
      expect(stats.requests).toBeGreaterThanOrEqual(0);
      expect(stats.upcoming).toBeGreaterThanOrEqual(0);
      expect(stats.completed).toBeGreaterThanOrEqual(0);
      expect(stats.totalValue).toBeGreaterThanOrEqual(0);
    });

    it("should calculate stats for 30d period (default)", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PENDING",
          createdAt: new Date(),
          finalPrice: 500,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId);

      expect(stats).toBeDefined();
      expect(stats.requests).toBeDefined();
      expect(stats.upcoming).toBeDefined();
      expect(stats.completed).toBeDefined();
      expect(stats.cancellations).toBeDefined();
      expect(stats.totalValue).toBeDefined();
    });

    it("should calculate stats for 90d period", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings: any[] = [];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(mockBookings);

      const stats = await getBookingStats(mockUserId, "90d");

      expect(stats).toBeDefined();
      expect(stats.requests).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.totalValue).toBe(0);
    });
  });

  describe("status aggregation", () => {
    it("should count PENDING bookings as requests", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PENDING",
          createdAt: new Date(),
          finalPrice: 500,
          date: new Date(),
        },
        {
          id: "b2",
          status: "PENDING",
          createdAt: new Date(),
          finalPrice: 600,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.requests).toBe(2);
    });

    it("should count PAID bookings as completed when date is past", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: now,
          date: pastDate,
          finalPrice: 500,
        },
        {
          id: "b2",
          status: "COMPLETED",
          createdAt: now,
          date: pastDate,
          finalPrice: 600,
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.completed).toBe(1); // Only COMPLETED status
    });

    it("should count CANCELLED and REJECTED bookings separately", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "CANCELLED",
          createdAt: new Date(),
          finalPrice: 500,
          date: new Date(),
        },
        {
          id: "b2",
          status: "REJECTED",
          createdAt: new Date(),
          finalPrice: 600,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.cancellations).toBe(2);
    });
  });

  describe("value calculations", () => {
    it("should sum total value from PAID bookings", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: 500,
          date: new Date(),
        },
        {
          id: "b2",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: 1000,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.totalValue).toBe(1500);
    });

    it("should handle bookings with decimal prices", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: 500.5,
          date: new Date(),
        },
        {
          id: "b2",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: 999.99,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(typeof stats.totalValue).toBe("number");
      expect(stats.totalValue).toBe(1500.49);
    });

    it("should return zero for empty bookings", async () => {
      const mockCharters = [{ id: "c1" }];
      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue([]);

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.requests).toBe(0);
      expect(stats.upcoming).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.cancellations).toBe(0);
      expect(stats.totalValue).toBe(0);
    });
  });

  describe("upcoming bookings", () => {
    it("should count PAID bookings with future dates as upcoming", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: now,
          date: futureDate,
          finalPrice: 500,
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.upcoming).toBe(1);
    });

    it("should not count past PAID bookings as upcoming", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: now,
          date: pastDate,
          finalPrice: 500,
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.upcoming).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("should handle null finalPrice values", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: null,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.totalValue).toBe(0);
    });

    it("should handle missing date field", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "PAID",
          createdAt: new Date(),
          finalPrice: 500,
          date: null,
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats).toBeDefined();
    });

    it("should not crash on unknown status", async () => {
      const mockCharters = [{ id: "c1" }];
      const mockBookings = [
        {
          id: "b1",
          status: "UNKNOWN_STATUS",
          createdAt: new Date(),
          finalPrice: 500,
          date: new Date(),
        },
      ];

      vi.mocked(prisma.charter.findMany).mockResolvedValue(mockCharters as any);
      vi.mocked(prismaMarket.booking.findMany).mockResolvedValue(
        mockBookings as any
      );

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats).toBeDefined();
    });

    it("should handle captain with no charters", async () => {
      vi.mocked(prisma.charter.findMany).mockResolvedValue([]);

      const stats = await getBookingStats(mockUserId, "30d");

      expect(stats.requests).toBe(0);
      expect(stats.upcoming).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.cancellations).toBe(0);
      expect(stats.totalValue).toBe(0);
    });
  });
});
