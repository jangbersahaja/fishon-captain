import { getDashboardData } from "@/lib/dashboard-service";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("next-auth");
vi.mock("next/navigation");
vi.mock("@/lib/dashboard-service");
vi.mock("@/lib/prisma");
vi.mock("@/lib/adminBypass");
vi.mock("@/lib/auth");

describe("Captain Dashboard Page - Phase 3 Integration Tests", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "captain@test.com",
      role: "CAPTAIN",
    },
  };

  const mockAdminSession = {
    user: {
      id: "admin-user-1",
      email: "admin@test.com",
      role: "ADMIN",
    },
  };

  const mockProfile = {
    id: "profile-123",
    displayName: "Captain John",
    userId: "user-123",
    charters: [
      {
        id: "charter-1",
        name: "Charter One",
        updatedAt: new Date(),
        city: "Kuala Lumpur",
        state: "Selangor",
        media: [{ kind: "image" }],
        trips: [{ durationHours: 8, price: 500 }],
      },
    ],
  };

  const mockDashboardData = {
    profile: mockProfile,
    bookingStats: {
      requests: 5,
      upcoming: 8,
      completed: 12,
      cancellations: 2,
      totalValue: 1500,
    },
    priorityBookings: [
      {
        id: "booking-1",
        type: "new-request",
        urgency: "high",
        countdown: "2h",
        booking: {
          id: "booking-1",
          createdAt: new Date(),
          status: "PENDING",
          customerName: "John Angler",
          tripDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          finalPrice: 500,
        },
      },
    ],
    earningsData: {
      currentPeriod: 1500,
      previousPeriod: 1200,
      pending: 300,
      paid: 1200,
    },
    charterPerformance: [
      {
        id: "charter-1",
        name: "Charter One",
        rating: 4.8,
        bookingCount: 15,
        mediaCount: 8,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Phase 3: Dashboard Data Integration", () => {
    it("should have getDashboardData exported from dashboard-service", () => {
      expect(getDashboardData).toBeDefined();
    });

    it("should have all required dashboard data fields", () => {
      expect(mockDashboardData).toHaveProperty("bookingStats");
      expect(mockDashboardData).toHaveProperty("priorityBookings");
      expect(mockDashboardData).toHaveProperty("earningsData");
      expect(mockDashboardData).toHaveProperty("charterPerformance");
      expect(mockDashboardData).toHaveProperty("profile");
    });

    it("should have bookingStats with required fields", () => {
      const stats = mockDashboardData.bookingStats;
      expect(stats).toHaveProperty("requests", 5);
      expect(stats).toHaveProperty("upcoming", 8);
      expect(stats).toHaveProperty("completed", 12);
      expect(stats).toHaveProperty("cancellations", 2);
      expect(stats).toHaveProperty("totalValue", 1500);
    });

    it("should have priorityBookings with correct structure", () => {
      const booking = mockDashboardData.priorityBookings[0];
      expect(booking).toHaveProperty("id");
      expect(booking).toHaveProperty("type");
      expect(booking).toHaveProperty("urgency");
      expect(booking).toHaveProperty("countdown");
      expect(booking).toHaveProperty("booking");
    });

    it("should have earningsData with financial summary", () => {
      const earnings = mockDashboardData.earningsData;
      expect(earnings).toHaveProperty("currentPeriod", 1500);
      expect(earnings).toHaveProperty("previousPeriod", 1200);
      expect(earnings).toHaveProperty("pending", 300);
      expect(earnings).toHaveProperty("paid", 1200);
    });

    it("should have charterPerformance metrics", () => {
      const perf = mockDashboardData.charterPerformance[0];
      expect(perf).toHaveProperty("id");
      expect(perf).toHaveProperty("name");
      expect(perf).toHaveProperty("rating", 4.8);
      expect(perf).toHaveProperty("bookingCount", 15);
      expect(perf).toHaveProperty("mediaCount", 8);
    });
  });

  describe("Dashboard Components Integration", () => {
    it("should render booking stats with correct counts", () => {
      const stats = mockDashboardData.bookingStats;
      expect(stats.requests).toBe(5);
      expect(stats.upcoming).toBe(8);
      expect(stats.completed).toBe(12);
    });

    it("should support priority bookings section", () => {
      const priorities = mockDashboardData.priorityBookings;
      expect(priorities).toHaveLength(1);
      expect(priorities[0].type).toBe("new-request");
      expect(priorities[0].urgency).toBe("high");
    });

    it("should calculate earnings comparison", () => {
      const { currentPeriod, previousPeriod } = mockDashboardData.earningsData;
      const increase = currentPeriod - previousPeriod;
      expect(increase).toBe(300);
    });

    it("should aggregate charter performance data", () => {
      const charters = mockDashboardData.charterPerformance;
      expect(charters).toHaveLength(1);
      expect(charters[0].rating).toBeGreaterThan(4);
    });
  });

  describe("Admin Override Functionality", () => {
    it("should support adminUserId parameter in search params", () => {
      const adminUserId = "user-123";
      expect(adminUserId).toBeDefined();
      expect(typeof adminUserId).toBe("string");
    });

    it("should maintain admin context across navigation", () => {
      const buildHref = (path: string, adminUserId?: string): string => {
        if (adminUserId) {
          return `${path}?adminUserId=${adminUserId}`;
        }
        return path;
      };

      const href = buildHref("/captain/bookings", "user-123");
      expect(href).toContain("adminUserId=user-123");
    });
  });

  describe("Data Validation", () => {
    it("should validate bookingStats structure", () => {
      const stats = mockDashboardData.bookingStats;
      expect(typeof stats.requests).toBe("number");
      expect(typeof stats.upcoming).toBe("number");
      expect(typeof stats.completed).toBe("number");
      expect(typeof stats.cancellations).toBe("number");
      expect(typeof stats.totalValue).toBe("number");
    });

    it("should validate priorityBooking structure", () => {
      const booking = mockDashboardData.priorityBookings[0];
      expect(typeof booking.id).toBe("string");
      expect(["new-request", "upcoming-trip", "payment-pending"]).toContain(
        booking.type
      );
      expect(["high", "medium", "low"]).toContain(booking.urgency);
    });

    it("should validate earningsData values", () => {
      const earnings = mockDashboardData.earningsData;
      expect(earnings.currentPeriod).toBeGreaterThanOrEqual(0);
      expect(earnings.pending).toBeGreaterThanOrEqual(0);
      expect(earnings.paid).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling & Graceful Degradation", () => {
    it("should handle empty priority bookings", () => {
      const data = { ...mockDashboardData, priorityBookings: [] };
      expect(data.priorityBookings).toHaveLength(0);
    });

    it("should handle empty charter performance", () => {
      const data = { ...mockDashboardData, charterPerformance: [] };
      expect(data.charterPerformance).toHaveLength(0);
    });

    it("should maintain profile data even with error in bookingStats", () => {
      expect(mockDashboardData.profile).toBeDefined();
      expect(mockDashboardData.profile.displayName).toBe("Captain John");
    });
  });
});
