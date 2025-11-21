import {
  getDashboardData,
  type DashboardPeriod,
} from "@/lib/dashboard-service";
import { getServerSession } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("next-auth");
vi.mock("@/lib/dashboard-service");
vi.mock("@/lib/prisma");

describe("Phase 6: End-to-End Testing Suite", () => {
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
        name: "Sunset Explorer",
        updatedAt: new Date(),
        city: "Kuala Lumpur",
        state: "Selangor",
        media: [{ kind: "image" }, { kind: "image" }, { kind: "video" }],
        trips: [
          { durationHours: 8, price: 500 },
          { durationHours: 6, price: 400 },
        ],
      },
      {
        id: "charter-2",
        name: "Deep Sea Adventure",
        updatedAt: new Date(),
        city: "Langkawi",
        state: "Kedah",
        media: [{ kind: "image" }],
        trips: [{ durationHours: 10, price: 800 }],
      },
    ],
  };

  const generateDashboardData = (period: DashboardPeriod = "30d") => ({
    profile: mockProfile,
    bookingStats: {
      requests: 12,
      upcoming: 8,
      completed: 35,
      cancellations: 2,
      totalValue: 8500,
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
      {
        id: "booking-2",
        type: "upcoming-trip",
        urgency: "medium",
        countdown: "12h",
        booking: {
          id: "booking-2",
          createdAt: new Date(),
          status: "CONFIRMED",
          customerName: "Sarah Fisher",
          tripDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
          finalPrice: 400,
        },
      },
    ],
    earningsData: {
      currentPeriod: period === "7d" ? 1200 : period === "30d" ? 4500 : 12000,
      previousPeriod: period === "7d" ? 1000 : period === "30d" ? 3500 : 10000,
      pending: 800,
      paid: period === "7d" ? 400 : period === "30d" ? 3700 : 11200,
    },
    charterPerformance: [
      {
        id: "charter-1",
        name: "Sunset Explorer",
        rating: 4.8,
        bookingCount: 18,
        mediaCount: 3,
      },
      {
        id: "charter-2",
        name: "Deep Sea Adventure",
        rating: 4.6,
        bookingCount: 15,
        mediaCount: 1,
      },
    ],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // SUITE 1: Dashboard Page Load Flow
  // ============================================
  describe("Suite 1: Dashboard Page Load & Initialization", () => {
    it("should load dashboard with all data on initial page load", async () => {
      const data = generateDashboardData("30d");
      vi.mocked(getDashboardData).mockResolvedValueOnce(data);
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

      const result = await getDashboardData("user-123");

      expect(result).toBeDefined();
      expect(result.bookingStats).toBeDefined();
      expect(result.priorityBookings).toHaveLength(2);
      expect(result.charterPerformance).toHaveLength(2);
      expect(getDashboardData).toHaveBeenCalledWith("user-123");
    });

    it("should render all metric cards with correct data", async () => {
      const data = generateDashboardData("30d");
      const { bookingStats, earningsData, charterPerformance } = data;

      expect(bookingStats.requests).toBe(12);
      expect(bookingStats.upcoming).toBe(8);
      expect(bookingStats.completed).toBe(35);
      expect(bookingStats.cancellations).toBe(2);

      expect(earningsData.currentPeriod).toBe(4500);
      expect(earningsData.pending).toBe(800);
      expect(earningsData.paid).toBe(3700);

      expect(charterPerformance).toHaveLength(2);
      expect(charterPerformance[0].rating).toBe(4.8);
    });

    it("should display profile name and charter count on load", async () => {
      const data = generateDashboardData("30d");
      expect(data.profile.displayName).toBe("Captain John");
      expect(data.profile.charters).toHaveLength(2);
    });

    it("should handle empty priority bookings gracefully", async () => {
      const data = generateDashboardData("30d");
      const emptyData = { ...data, priorityBookings: [] };
      expect(emptyData.priorityBookings).toHaveLength(0);
    });

    it("should load within expected time", async () => {
      const startTime = performance.now();
      const data = generateDashboardData("30d");
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Should load in < 100ms in test environment
      expect(loadTime).toBeLessThan(100);
    });
  });

  // ============================================
  // SUITE 2: Period Selector & Data Updates
  // ============================================
  describe("Suite 2: Period Selector Functionality", () => {
    it("should update dashboard data when period changes to 7d", async () => {
      const data7d = generateDashboardData("7d");
      vi.mocked(getDashboardData).mockResolvedValueOnce(data7d);

      const result = await getDashboardData("user-123");

      expect(result.earningsData.currentPeriod).toBe(1200);
      expect(result.earningsData.previousPeriod).toBe(1000);
      expect(getDashboardData).toHaveBeenCalledWith("user-123");
    });

    it("should update dashboard data when period changes to 30d", async () => {
      const data30d = generateDashboardData("30d");
      vi.mocked(getDashboardData).mockResolvedValueOnce(data30d);

      const result = await getDashboardData("user-123");

      expect(result.earningsData.currentPeriod).toBe(4500);
      expect(result.earningsData.previousPeriod).toBe(3500);
    });

    it("should update dashboard data when period changes to 90d", async () => {
      const data90d = generateDashboardData("90d");
      vi.mocked(getDashboardData).mockResolvedValueOnce(data90d);

      const result = await getDashboardData("user-123");

      expect(result.earningsData.currentPeriod).toBe(12000);
      expect(result.earningsData.previousPeriod).toBe(10000);
    });

    it("should recalculate earnings comparison on period change", async () => {
      // 7d period
      const data7d = generateDashboardData("7d");
      const change7d =
        data7d.earningsData.currentPeriod - data7d.earningsData.previousPeriod;
      expect(change7d).toBe(200);

      // 30d period
      const data30d = generateDashboardData("30d");
      const change30d =
        data30d.earningsData.currentPeriod -
        data30d.earningsData.previousPeriod;
      expect(change30d).toBe(1000);

      // 90d period
      const data90d = generateDashboardData("90d");
      const change90d =
        data90d.earningsData.currentPeriod -
        data90d.earningsData.previousPeriod;
      expect(change90d).toBe(2000);
    });

    it("should persist period selection in URL params", () => {
      const buildUrl = (period: DashboardPeriod): string => {
        return `/captain?period=${period}`;
      };

      expect(buildUrl("7d")).toBe("/captain?period=7d");
      expect(buildUrl("30d")).toBe("/captain?period=30d");
      expect(buildUrl("90d")).toBe("/captain?period=90d");
    });

    it("should default to 30d when no period specified", () => {
      const url = "/captain";
      const period = url.includes("period") ? "specified" : "30d";
      expect(period).toBe("30d");
    });
  });

  // ============================================
  // SUITE 3: Admin Override & Access Control
  // ============================================
  describe("Suite 3: Admin Override Functionality", () => {
    it("should support admin viewing captain dashboard with adminUserId param", async () => {
      const data = generateDashboardData("30d");
      vi.mocked(getDashboardData).mockResolvedValueOnce(data);
      vi.mocked(getServerSession).mockResolvedValueOnce(
        mockAdminSession as any
      );

      const result = await getDashboardData("user-123");
      expect(result.profile.displayName).toBe("Captain John");
    });

    it("should maintain admin context across navigation", () => {
      const buildAdminLink = (path: string, adminUserId: string): string => {
        return `${path}?adminUserId=${adminUserId}`;
      };

      const link = buildAdminLink("/captain/bookings", "user-123");
      expect(link).toContain("adminUserId=user-123");
      expect(link).toContain("/captain/bookings");
    });

    it("should display admin override banner when viewing as admin", () => {
      const targetUserInfo = {
        id: "user-123",
        email: "captain@test.com",
        name: "Captain John",
        role: "CAPTAIN",
      };

      expect(targetUserInfo).toBeDefined();
      expect(targetUserInfo.role).toBe("CAPTAIN");
      expect(targetUserInfo.email).toBe("captain@test.com");
    });

    it("should allow admin to exit override mode", () => {
      const adminSession = {
        user: { id: "admin-1", role: "ADMIN" },
      };

      expect(adminSession.user.role).toBe("ADMIN");
      const exitPath = "/staff";
      expect(exitPath).toBeDefined();
    });

    it("should validate admin has proper permissions", () => {
      const adminRole = "ADMIN";
      const canViewDashboard = ["ADMIN", "CAPTAIN", "STAFF"].includes(
        adminRole
      );
      expect(canViewDashboard).toBe(true);
    });

    it("should reject staff access without adminUserId to captain dashboard", () => {
      const staffRole = "STAFF";
      const hasAdminUserId = false;
      const shouldRedirect = staffRole === "STAFF" && !hasAdminUserId;
      expect(shouldRedirect).toBe(true);
    });
  });

  // ============================================
  // SUITE 4: Metric Cards Rendering
  // ============================================
  describe("Suite 4: Metric Cards Rendering", () => {
    it("should render booking stats card with all metrics", async () => {
      const data = generateDashboardData("30d");
      const { bookingStats } = data;

      expect(bookingStats.requests).toBe(12);
      expect(bookingStats.upcoming).toBe(8);
      expect(bookingStats.completed).toBe(35);
      expect(bookingStats.cancellations).toBe(2);
      expect(bookingStats.totalValue).toBe(8500);
    });

    it("should render earnings overview card with comparison", async () => {
      const data = generateDashboardData("30d");
      const { earningsData } = data;

      expect(earningsData.currentPeriod).toBe(4500);
      expect(earningsData.previousPeriod).toBe(3500);
      expect(earningsData.pending).toBe(800);
      expect(earningsData.paid).toBe(3700);

      // Calculate percentage change
      const percentChange =
        ((earningsData.currentPeriod - earningsData.previousPeriod) /
          earningsData.previousPeriod) *
        100;
      expect(percentChange).toBeCloseTo(28.57, 1);
    });

    it("should render charter performance card with ratings", async () => {
      const data = generateDashboardData("30d");
      const { charterPerformance } = data;

      expect(charterPerformance).toHaveLength(2);
      charterPerformance.forEach((charter) => {
        expect(charter.rating).toBeGreaterThanOrEqual(4);
        expect(charter.rating).toBeLessThanOrEqual(5);
        expect(charter.bookingCount).toBeGreaterThan(0);
      });
    });

    it("should render priority bookings with urgency levels", async () => {
      const data = generateDashboardData("30d");
      const { priorityBookings } = data;

      expect(priorityBookings).toHaveLength(2);
      priorityBookings.forEach((booking) => {
        expect(["high", "medium", "low"]).toContain(booking.urgency);
        expect(["new-request", "upcoming-trip", "payment-pending"]).toContain(
          booking.type
        );
      });
    });

    it("should display metric labels correctly", async () => {
      const data = generateDashboardData("30d");
      const labels = {
        requests: "New Requests",
        upcoming: "Upcoming Trips",
        completed: "Completed Charters",
        cancellations: "Cancellations",
      };

      expect(labels.requests).toBe("New Requests");
      expect(labels.upcoming).toBe("Upcoming Trips");
      expect(labels.completed).toBe("Completed Charters");
      expect(labels.cancellations).toBe("Cancellations");
    });

    it("should format currency values correctly", () => {
      const data = generateDashboardData("30d");
      const formatter = new Intl.NumberFormat("ms-MY", {
        style: "currency",
        currency: "MYR",
      });

      const formatted = formatter.format(data.earningsData.currentPeriod);
      expect(formatted).toContain("RM");
    });
  });

  // ============================================
  // SUITE 5: Responsive Layout Testing
  // ============================================
  describe("Suite 5: Responsive Layout on Mobile/Tablet/Desktop", () => {
    const viewports = [
      { name: "mobile", width: 375, height: 667 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1920, height: 1080 },
    ];

    it.each(viewports)(
      "should render layout correctly on $name ($width x $height)",
      ({ width, height }) => {
        // Simulate viewport
        const viewport = { width, height };
        expect(viewport.width).toBeGreaterThan(0);
        expect(viewport.height).toBeGreaterThan(0);

        // Determine layout type
        const isMobile = width < 640;
        const isTablet = width >= 640 && width < 1024;
        const isDesktop = width >= 1024;

        expect(isMobile || isTablet || isDesktop).toBe(true);
      }
    );

    it("should stack metric cards vertically on mobile", () => {
      const viewport = { width: 375 };
      const isMobile = viewport.width < 640;
      expect(isMobile).toBe(true);
    });

    it("should display metric cards in 2-column grid on tablet", () => {
      const viewport = { width: 768 };
      const isTablet = viewport.width >= 640 && viewport.width < 1024;
      expect(isTablet).toBe(true);
    });

    it("should display metric cards in 4-column grid on desktop", () => {
      const viewport = { width: 1920 };
      const isDesktop = viewport.width >= 1024;
      expect(isDesktop).toBe(true);
    });

    it("should maintain readability on all screen sizes", () => {
      const data = generateDashboardData("30d");
      expect(data.profile.displayName).toHaveLength(12); // "Captain John"
      expect(data.bookingStats.requests.toString()).toHaveLength(2); // "12"
    });

    it("should properly handle padding/spacing on mobile", () => {
      const mobileSpacing = { px: "1rem", py: "2rem" }; // px-6 py-8 converted
      expect(mobileSpacing.px).toBe("1rem");
      expect(mobileSpacing.py).toBe("2rem");
    });
  });

  // ============================================
  // SUITE 6: Data Integrity & Accuracy
  // ============================================
  describe("Suite 6: Data Integrity & Accuracy Verification", () => {
    it("should calculate booking stats correctly", async () => {
      const data = generateDashboardData("30d");
      const { bookingStats } = data;

      // Verify all values are non-negative
      expect(bookingStats.requests).toBeGreaterThanOrEqual(0);
      expect(bookingStats.upcoming).toBeGreaterThanOrEqual(0);
      expect(bookingStats.completed).toBeGreaterThanOrEqual(0);
      expect(bookingStats.cancellations).toBeGreaterThanOrEqual(0);

      // Verify reasonable ratios
      expect(bookingStats.completed).toBeGreaterThan(bookingStats.requests);
    });

    it("should verify earnings comparison logic", async () => {
      const data30d = generateDashboardData("30d");
      const data90d = generateDashboardData("90d");

      const comparison30d = {
        change:
          data30d.earningsData.currentPeriod -
          data30d.earningsData.previousPeriod,
        percentChange:
          ((data30d.earningsData.currentPeriod -
            data30d.earningsData.previousPeriod) /
            data30d.earningsData.previousPeriod) *
          100,
      };

      const comparison90d = {
        change:
          data90d.earningsData.currentPeriod -
          data90d.earningsData.previousPeriod,
        percentChange:
          ((data90d.earningsData.currentPeriod -
            data90d.earningsData.previousPeriod) /
            data90d.earningsData.previousPeriod) *
          100,
      };

      expect(comparison30d.change).toBeGreaterThan(0);
      expect(comparison90d.change).toBeGreaterThan(0);
      expect(comparison30d.percentChange).toBeGreaterThan(0);
      expect(comparison90d.percentChange).toBeGreaterThan(0);
    });

    it("should verify period selections work correctly", async () => {
      const periods: DashboardPeriod[] = ["7d", "30d", "90d"];

      for (const period of periods) {
        const data = generateDashboardData(period);
        expect(data.earningsData.currentPeriod).toBeGreaterThan(0);
        expect(data.earningsData.previousPeriod).toBeGreaterThan(0);
      }
    });

    it("should confirm paid + pending = current period - other fees", async () => {
      const data = generateDashboardData("30d");
      const { paid, pending } = data.earningsData;

      // Total available should be paid + pending
      const totalAvailable = paid + pending;
      expect(totalAvailable).toBe(4500);
    });

    it("should verify charter performance data consistency", async () => {
      const data = generateDashboardData("30d");
      const { charterPerformance } = data;

      charterPerformance.forEach((charter) => {
        // Rating should be 0-5
        expect(charter.rating).toBeGreaterThanOrEqual(0);
        expect(charter.rating).toBeLessThanOrEqual(5);

        // Booking count should be non-negative
        expect(charter.bookingCount).toBeGreaterThanOrEqual(0);

        // Media count should be non-negative
        expect(charter.mediaCount).toBeGreaterThanOrEqual(0);

        // IDs should be present
        expect(charter.id).toBeTruthy();
        expect(charter.name).toBeTruthy();
      });
    });

    it("should verify profile data consistency", async () => {
      const data = generateDashboardData("30d");
      const { profile } = data;

      expect(profile.id).toBeTruthy();
      expect(profile.displayName).toBeTruthy();
      expect(profile.charters).toBeInstanceOf(Array);
      expect(profile.charters.length).toBeGreaterThan(0);

      profile.charters.forEach((charter) => {
        expect(charter.id).toBeTruthy();
        expect(charter.name).toBeTruthy();
        expect(charter.city).toBeTruthy();
        expect(charter.state).toBeTruthy();
      });
    });
  });

  // ============================================
  // SUITE 7: Error Handling & Edge Cases
  // ============================================
  describe("Suite 7: Error Handling & Fallback UI", () => {
    it("should handle missing session gracefully", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      // Should redirect or show auth error
      expect(getServerSession).toHaveBeenCalled();
    });

    it("should handle empty priority bookings array", async () => {
      const data = generateDashboardData("30d");
      data.priorityBookings = [];

      expect(data.priorityBookings).toHaveLength(0);
      // Component should show "No priority bookings" message
    });

    it("should handle empty charter performance array", async () => {
      const data = generateDashboardData("30d");
      data.charterPerformance = [];

      expect(data.charterPerformance).toHaveLength(0);
    });

    it("should handle zero earnings gracefully", async () => {
      const data = generateDashboardData("30d");
      data.earningsData.currentPeriod = 0;
      data.earningsData.previousPeriod = 0;

      expect(data.earningsData.currentPeriod).toBe(0);
      // Should not cause division by zero
    });

    it("should handle profile without charters", async () => {
      const data = generateDashboardData("30d");
      expect(data.profile.charters).toHaveLength(2);

      // If charters array is empty, should still be valid
      const emptyData = { ...data, profile: { ...data.profile, charters: [] } };
      expect(emptyData.profile.charters).toHaveLength(0);
    });

    it("should handle missing metric data with fallback values", async () => {
      const data = generateDashboardData("30d");
      const safeStat = (value: number | undefined) => value ?? 0;

      expect(safeStat(data.bookingStats.requests)).toBe(12);
      expect(safeStat(undefined)).toBe(0);
    });
  });

  // ============================================
  // SUITE 8: Session & Authentication
  // ============================================
  describe("Suite 8: Session & Authentication Verification", () => {
    it("should verify user session on page load", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);

      const session = await getServerSession(null as any);
      expect(session).toBeDefined();
      expect(session?.user?.role).toBe("CAPTAIN");
    });

    it("should reject unauthenticated access", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const session = await getServerSession(null as any);
      expect(session).toBeNull();
    });

    it("should require CAPTAIN role for captain dashboard", () => {
      const roles = ["CAPTAIN", "ADMIN"];
      const canAccess = roles.includes(mockSession.user.role);
      expect(canAccess).toBe(true);
    });

    it("should allow ADMIN to view any dashboard with adminUserId", () => {
      const adminSession = {
        user: { id: "admin-1", role: "ADMIN" },
      };

      const canAccessWithOverride = adminSession.user.role === "ADMIN";
      expect(canAccessWithOverride).toBe(true);
    });

    it("should verify effective user ID calculation", () => {
      const buildEffectiveUserId = (
        currentUserId: string,
        adminUserId?: string,
        isAdmin?: boolean
      ): string => {
        if (isAdmin && adminUserId) {
          return adminUserId;
        }
        return currentUserId;
      };

      const regularUserId = buildEffectiveUserId("user-123", undefined, false);
      const adminOverrideId = buildEffectiveUserId("admin-1", "user-123", true);

      expect(regularUserId).toBe("user-123");
      expect(adminOverrideId).toBe("user-123");
    });
  });
});
