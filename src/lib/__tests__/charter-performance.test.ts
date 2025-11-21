/**
 * Charter Performance Tests
 * TDD tests for charter performance metrics
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCharterPerformance } from "../charter-service";

// Mock both Prisma clients
vi.mock("@/lib/prisma", () => ({
  prisma: {
    charter: {
      findMany: vi.fn(),
    },
    charterMedia: {
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma-market", () => ({
  prismaMarket: {
    booking: {
      groupBy: vi.fn(),
    },
  },
  isMarketDbConfigured: vi.fn(() => true),
}));

import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";

describe("Charter Performance", () => {
  const mockCaptainId = "captain-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCharterPerformance", () => {
    describe("basic charter data", () => {
      it("should include charter id, name, and active status", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 5 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance).toBeInstanceOf(Array);
        expect(performance.length).toBe(1);
        expect(performance[0]).toHaveProperty("id", "c1");
        expect(performance[0]).toHaveProperty("name", "Charter One");
        expect(performance[0]).toHaveProperty("isActive", true);
      });

      it("should return empty array for captain with no charters", async () => {
        vi.mocked(prisma.charter.findMany).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance).toEqual([]);
      });

      it("should include rating field", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: 4.5,
            updatedAt: new Date(),
            _count: { media: 3 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance.length).toBe(1);
        expect(performance[0]).toHaveProperty("rating", 4.5);
      });
    });

    describe("booking count aggregation", () => {
      it("should count PAID and COMPLETED bookings per charter", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 2 },
          },
        ];

        const mockBookingCounts = [
          {
            charterId: "c1",
            _count: {
              id: 5,
            },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue(
          mockBookingCounts as any
        );

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance.length).toBe(1);
        expect(performance[0]).toHaveProperty("bookingCount", 5);
      });

      it("should handle charters with zero bookings", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 1 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0].bookingCount).toBe(0);
      });

      it("should handle multiple charters with different booking counts", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 3 },
          },
          {
            id: "c2",
            name: "Charter Two",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 2 },
          },
        ];

        const mockBookingCounts = [
          {
            charterId: "c1",
            _count: { id: 10 },
          },
          {
            charterId: "c2",
            _count: { id: 3 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue(
          mockBookingCounts as any
        );

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance).toHaveLength(2);
        expect(performance[0].bookingCount).toBe(10);
        expect(performance[1].bookingCount).toBe(3);
      });
    });

    describe("media count aggregation", () => {
      it("should include media count for each charter", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            ownerId: mockCaptainId,
            _count: {
              media: 5,
            },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0]).toHaveProperty("mediaCount");
        expect(performance[0].mediaCount).toBe(5);
      });

      it("should handle zero media", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            ownerId: mockCaptainId,
            _count: {
              media: 0,
            },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0].mediaCount).toBe(0);
      });
    });

    describe("last updated timestamp", () => {
      it("should include lastUpdated field", async () => {
        const now = new Date();
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: now,
            _count: { media: 2 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0]).toHaveProperty("lastUpdated");
        expect(performance[0].lastUpdated).toEqual(now);
      });
    });

    describe("sorting and ordering", () => {
      it("should return charters in consistent order", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 2 },
          },
          {
            id: "c2",
            name: "Charter Two",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 3 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance).toHaveLength(2);
        expect(performance[0].id).toBe("c1");
        expect(performance[1].id).toBe("c2");
      });
    });

    describe("edge cases", () => {
      it("should handle charters with null rating", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 2 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0].rating).toBeNull();
      });

      it("should handle inactive charters", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: false,
            rating: null,
            updatedAt: new Date(),
            _count: { media: 0 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0].isActive).toBe(false);
      });

      it("should handle decimal rating values", async () => {
        const mockCharters = [
          {
            id: "c1",
            name: "Charter One",
            isActive: true,
            rating: 4.75,
            updatedAt: new Date(),
            _count: { media: 5 },
          },
        ];

        vi.mocked(prisma.charter.findMany).mockResolvedValue(
          mockCharters as any
        );
        vi.mocked(prismaMarket.booking.groupBy).mockResolvedValue([]);

        const performance = await getCharterPerformance(mockCaptainId);

        expect(performance[0].rating).toBe(4.75);
      });
    });
  });
});
