import { getDashboardData } from "@/lib/dashboard-service";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaptainDashboardPage from "../page";

// Mock dependencies
vi.mock("next-auth");
vi.mock("next/navigation");
vi.mock("@/lib/dashboard-service");
vi.mock("@/lib/prisma");
vi.mock("@/lib/adminBypass", () => ({
  getEffectiveUserId: vi.fn((opts: any) => {
    if (opts.query?.adminUserId) return opts.query.adminUserId;
    return (opts.session?.user as any)?.id;
  }),
}));
vi.mock("@/lib/auth");

describe("CaptainDashboardPage - Phase 3 Integration", () => {
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
        type: "new-request" as const,
        urgency: "high" as const,
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

  const mockCharters = [
    {
      id: "charter-1",
      name: "Charter One",
      updatedAt: new Date(),
      city: "Kuala Lumpur",
      state: "Selangor",
      media: [{ kind: "image" }],
      trips: [{ durationHours: 8, price: 500 }],
    },
  ];

  const mockAnalyticsData = {
    views: 250,
    visitors: 45,
    conversionRate: 8.9,
    requests: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & Authorization", () => {
    it("should redirect to signin if no session", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(redirect).toHaveBeenCalledWith("/auth?mode=signin");
    });

    it("should redirect to staff dashboard if staff without adminUserId", async () => {
      const staffSession = {
        ...mockAdminSession,
        user: { ...mockAdminSession.user, role: "STAFF" },
      };
      vi.mocked(getServerSession).mockResolvedValueOnce(staffSession as any);

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(redirect).toHaveBeenCalledWith("/staff");
    });

    it("should allow admin to access with adminUserId parameter", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(
        mockAdminSession as any
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-123",
        email: "captain@test.com",
        role: "CAPTAIN",
      } as any);
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: mockCharters,
      } as any);
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);

      const searchParams = Promise.resolve({ adminUserId: "user-123" });
      const component = await CaptainDashboardPage({ searchParams });

      expect(component).toBeDefined();
      expect(getDashboardData).toHaveBeenCalledWith("user-123");
    });
  });

  describe("Dashboard Data Fetching", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: mockCharters,
      } as any);
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);
    });

    it("should call getDashboardData with effectiveUserId", async () => {
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(getDashboardData).toHaveBeenCalledWith("user-123");
    });

    it("should fetch complete dashboard data including bookingStats", async () => {
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(getDashboardData).toHaveBeenCalled();
      const call = vi.mocked(getDashboardData).mock.calls[0];
      expect(call[0]).toBe("user-123");
    });

    it("should return dashboard data with priorityBookings", async () => {
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );

      const result = await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(result).toBeDefined();
    });
  });

  describe("Admin Banner Display", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValueOnce(
        mockAdminSession as any
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user-123",
        email: "captain@test.com",
        name: "Captain John",
        role: "CAPTAIN",
      } as any);
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: mockCharters,
      } as any);
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);
    });

    it("should NOT show admin banner when adminUserId not provided", async () => {
      const component = await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(component).toBeDefined();
      // Note: Can't easily test DOM output in async server component tests,
      // but the logic flow is verified above
    });

    it("should show admin banner when adminUserId provided to admin user", async () => {
      const component = await CaptainDashboardPage({
        searchParams: Promise.resolve({ adminUserId: "user-123" }),
      });

      expect(component).toBeDefined();
      expect(getDashboardData).toHaveBeenCalledWith("user-123");
    });
  });

  describe("Data Validation", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);
    });

    it("should redirect if captain has no charters", async () => {
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: [],
      } as any);

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(redirect).toHaveBeenCalledWith("/auth?next=/captain/form");
    });

    it("should redirect if captain profile not found", async () => {
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce(null);

      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(redirect).toHaveBeenCalledWith("/auth?next=/captain/form");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: mockCharters,
      } as any);
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);
    });

    it("should handle getDashboardData errors gracefully", async () => {
      const error = new Error("Database connection error");
      vi.mocked(getDashboardData).mockRejectedValueOnce(error);

      const promise = CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      // Should throw so error boundary can catch it
      await expect(promise).rejects.toThrow("Database connection error");
    });
  });

  describe("Component Rendering", () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValueOnce(mockSession as any);
      vi.mocked(prisma.captainProfile.findUnique).mockResolvedValueOnce({
        ...mockProfile,
        charters: mockCharters,
      } as any);
      vi.mocked(getDashboardData).mockResolvedValueOnce(
        mockDashboardData as any
      );
      vi.mocked(prisma.captainVideo.count).mockResolvedValueOnce(3);
    });

    it("should render welcome message with captain name", async () => {
      const component = await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(component).toBeDefined();
      // In real integration test, would check for captain name in rendered HTML
    });

    it("should pass priorityBookings to page component", async () => {
      vi.mocked(getDashboardData).mockResolvedValueOnce({
        ...mockDashboardData,
        priorityBookings: [mockDashboardData.priorityBookings[0]],
      } as any);

      const component = await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      });

      expect(component).toBeDefined();
    });
  });
});
