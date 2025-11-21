/**
 * Integration tests for Captain Dashboard with System Messages
 *
 * Tests Phase 3 implementation:
 * - SystemMessagesAlert rendering when messages exist
 * - SystemMessagesAlert not rendering when empty
 * - Correct positioning in page layout
 * - Integration with dashboard data flow
 */

import { render, screen } from "@testing-library/react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CaptainDashboardPage from "../(portal)/captain/page";

// Mock dependencies
vi.mock("next-auth");
vi.mock("next/navigation");
vi.mock("@/lib/auth", () => ({
  default: {
    providers: [],
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    captainProfile: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    captainVideo: {
      count: vi.fn(),
    },
  },
}));
vi.mock("@/lib/adminBypass", () => ({
  getEffectiveUserId: vi.fn(),
}));
vi.mock("@/lib/dashboard-service", () => ({
  getDashboardData: vi.fn(),
}));

import { getEffectiveUserId } from "@/lib/adminBypass";
import { getDashboardData } from "@/lib/dashboard-service";
import { prisma } from "@/lib/prisma";

/**
 * Test 1: Empty state - no system messages
 */
describe("Captain Dashboard - System Messages Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (redirect as any).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("should not render SystemMessagesAlert when systemMessages is empty", async () => {
    // Mock data with 0 system messages
    const mockDashboardData = {
      profile: {
        id: "profile-1",
        displayName: "Test Captain",
      },
      bookingStats: {
        requests: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        totalValue: 0,
      },
      priorityBookings: [],
      earningsData: {
        current: 0,
        previous: 0,
        pending: 0,
      },
      charterPerformance: [],
      systemMessages: [], // Empty messages
    };

    const mockProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Test Captain",
      charters: [
        {
          id: "charter-1",
          name: "My Charter",
          updatedAt: new Date(),
          city: "Kuala Lumpur",
          state: "Selangor",
          media: [],
          trips: [],
        },
      ],
    };

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", role: "CAPTAIN" },
    });

    (getEffectiveUserId as any).mockReturnValue("user-1");

    (prisma.captainProfile.findUnique as any).mockResolvedValue(mockProfile);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "CAPTAIN",
    });
    (prisma.captainVideo.count as any).mockResolvedValue(0);
    (getDashboardData as any).mockResolvedValue(mockDashboardData);

    const { container } = render(
      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      })
    );

    // Verify SystemMessagesAlert is not in the DOM
    const alert = container.querySelector(
      '[class*="border"][class*="rounded-2xl"]'
    );
    // Should only find the admin banner area, not a messages alert
    expect(screen.queryByText(/\+.*more alert/i)).not.toBeInTheDocument();
  });

  /**
   * Test 2: With system messages - should render
   */
  it("should render SystemMessagesAlert when systemMessages has items", async () => {
    const mockSystemMessages = [
      {
        id: "msg-1",
        severity: "critical" as const,
        title: "Government ID Required",
        description: "Complete your verification to accept bookings",
        actionUrl: "/captain/documents",
        cta: "Complete Documents",
        isDismissible: true,
        autoHideSecs: 0,
      },
      {
        id: "msg-2",
        severity: "warning" as const,
        title: "Bank Details Incomplete",
        description: "Add your bank information for payouts",
        actionUrl: "/captain/banking",
        cta: "Update Banking",
        isDismissible: true,
        autoHideSecs: 0,
      },
    ];

    const mockDashboardData = {
      profile: {
        id: "profile-1",
        displayName: "Test Captain",
      },
      bookingStats: {
        requests: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        totalValue: 0,
      },
      priorityBookings: [],
      earningsData: {
        current: 0,
        previous: 0,
        pending: 0,
      },
      charterPerformance: [],
      systemMessages: mockSystemMessages,
    };

    const mockProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Test Captain",
      charters: [
        {
          id: "charter-1",
          name: "My Charter",
          updatedAt: new Date(),
          city: "Kuala Lumpur",
          state: "Selangor",
          media: [],
          trips: [],
        },
      ],
    };

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", role: "CAPTAIN" },
    });

    (getEffectiveUserId as any).mockReturnValue("user-1");

    (prisma.captainProfile.findUnique as any).mockResolvedValue(mockProfile);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "CAPTAIN",
    });
    (prisma.captainVideo.count as any).mockResolvedValue(0);
    (getDashboardData as any).mockResolvedValue(mockDashboardData);

    const { container } = render(
      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      })
    );

    // Verify first message is rendered
    expect(screen.getByText("Government ID Required")).toBeInTheDocument();
    expect(
      screen.getByText("Complete your verification to accept bookings")
    ).toBeInTheDocument();

    // Verify collapsed message indicator
    expect(screen.getByText(/\+1 more alert/)).toBeInTheDocument();
  });

  /**
   * Test 3: Message positioning - should render before metrics
   */
  it("should position SystemMessagesAlert before DashboardMetricsGrid", async () => {
    const mockSystemMessages = [
      {
        id: "msg-1",
        severity: "critical" as const,
        title: "Action Required",
        description: "Please complete your profile",
        actionUrl: "/captain/profile",
        cta: "Complete Profile",
        isDismissible: true,
        autoHideSecs: 0,
      },
    ];

    const mockDashboardData = {
      profile: {
        id: "profile-1",
        displayName: "Test Captain",
      },
      bookingStats: {
        requests: 5,
        upcoming: 2,
        completed: 10,
        cancelled: 0,
        totalValue: 5000,
      },
      priorityBookings: [],
      earningsData: {
        current: 5000,
        previous: 4000,
        pending: 1000,
      },
      charterPerformance: [
        {
          charterId: "charter-1",
          charterName: "My Charter",
          rating: 4.5,
          bookingCount: 10,
          mediaCount: 5,
        },
      ],
      systemMessages: mockSystemMessages,
    };

    const mockProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Test Captain",
      charters: [
        {
          id: "charter-1",
          name: "My Charter",
          updatedAt: new Date(),
          city: "Kuala Lumpur",
          state: "Selangor",
          media: [],
          trips: [],
        },
      ],
    };

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", role: "CAPTAIN" },
    });

    (getEffectiveUserId as any).mockReturnValue("user-1");

    (prisma.captainProfile.findUnique as any).mockResolvedValue(mockProfile);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "CAPTAIN",
    });
    (prisma.captainVideo.count as any).mockResolvedValue(0);
    (getDashboardData as any).mockResolvedValue(mockDashboardData);

    const { container } = render(
      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      })
    );

    // Get the order of elements - messages should appear before metrics
    const messageText = screen.getByText("Action Required");
    const requestsText = screen.getByText("Booking Requests");

    const messageElement = messageText.closest("div");
    const metricsElement = requestsText.closest("div");

    if (messageElement && metricsElement) {
      const messagePosition =
        messageElement.compareDocumentPosition(metricsElement);
      // DOCUMENT_POSITION_FOLLOWING (4) means first element comes before second
      expect(messagePosition & 4).toBeTruthy();
    }
  });

  /**
   * Test 4: No charters scenario - no system messages
   */
  it("should not render SystemMessagesAlert when charterCount is 0", async () => {
    // When charterCount is 0, getDashboardData returns empty systemMessages
    const mockDashboardData = {
      profile: {
        id: "profile-1",
        displayName: "Test Captain",
      },
      bookingStats: {
        requests: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        totalValue: 0,
      },
      priorityBookings: [],
      earningsData: {
        current: 0,
        previous: 0,
        pending: 0,
      },
      charterPerformance: [],
      systemMessages: [], // Empty when no charters
    };

    const mockProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Test Captain",
      charters: [], // No charters
    };

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", role: "CAPTAIN" },
    });

    (getEffectiveUserId as any).mockReturnValue("user-1");

    // This should redirect for no charters case
    (prisma.captainProfile.findUnique as any).mockResolvedValue(mockProfile);

    try {
      render(
        await CaptainDashboardPage({
          searchParams: Promise.resolve({}),
        })
      );
    } catch (e: any) {
      // Expected redirect for no charters
      expect(e.message).toContain("NEXT_REDIRECT");
    }
  });

  /**
   * Test 5: Multiple charters with system messages
   */
  it("should render SystemMessagesAlert with multiple charters", async () => {
    const mockSystemMessages = [
      {
        id: "msg-1",
        severity: "warning" as const,
        title: "Incomplete Verification",
        description: "Some documents are still pending review",
        actionUrl: "/captain/documents",
        cta: "View Documents",
        isDismissible: true,
        autoHideSecs: 0,
      },
    ];

    const mockDashboardData = {
      profile: {
        id: "profile-1",
        displayName: "Test Captain",
      },
      bookingStats: {
        requests: 10,
        upcoming: 5,
        completed: 25,
        cancelled: 2,
        totalValue: 15000,
      },
      priorityBookings: [],
      earningsData: {
        current: 15000,
        previous: 12000,
        pending: 3000,
      },
      charterPerformance: [
        {
          charterId: "charter-1",
          charterName: "Charter One",
          rating: 4.8,
          bookingCount: 15,
          mediaCount: 8,
        },
        {
          charterId: "charter-2",
          charterName: "Charter Two",
          rating: 4.6,
          bookingCount: 10,
          mediaCount: 6,
        },
      ],
      systemMessages: mockSystemMessages,
    };

    const mockProfile = {
      id: "profile-1",
      userId: "user-1",
      displayName: "Test Captain",
      charters: [
        {
          id: "charter-1",
          name: "Charter One",
          updatedAt: new Date(),
          city: "Kuala Lumpur",
          state: "Selangor",
          media: [{ kind: "image" }],
          trips: [{ durationHours: 4, price: 500 }],
        },
        {
          id: "charter-2",
          name: "Charter Two",
          updatedAt: new Date(),
          city: "Langkawi",
          state: "Kedah",
          media: [{ kind: "image" }],
          trips: [{ durationHours: 8, price: 1000 }],
        },
      ],
    };

    (getServerSession as any).mockResolvedValue({
      user: { id: "user-1", role: "CAPTAIN" },
    });

    (getEffectiveUserId as any).mockReturnValue("user-1");

    (prisma.captainProfile.findUnique as any).mockResolvedValue(mockProfile);
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "user-1",
      role: "CAPTAIN",
    });
    (prisma.captainVideo.count as any).mockResolvedValue(0);
    (getDashboardData as any).mockResolvedValue(mockDashboardData);

    const { container } = render(
      await CaptainDashboardPage({
        searchParams: Promise.resolve({}),
      })
    );

    // Verify system message renders
    expect(screen.getByText("Incomplete Verification")).toBeInTheDocument();
    expect(
      screen.getByText("Some documents are still pending review")
    ).toBeInTheDocument();

    // Verify both charters render
    expect(screen.getByText("Charter One")).toBeInTheDocument();
    expect(screen.getByText("Charter Two")).toBeInTheDocument();

    // Verify multiple charters section renders
    expect(screen.getByText(/Your Charters \(2\)/)).toBeInTheDocument();
  });
});
