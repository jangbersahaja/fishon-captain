/**
 * System Messages Service Tests
 * TDD tests for system message generation logic
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    messageDismissal: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  generateSystemMessages,
  getDismissedMessages,
} from "../system-messages";

describe("System Messages Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSystemMessages", () => {
    it("should generate RED critical message when government ID front is missing", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: null,
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      expect(messages).toContainEqual(
        expect.objectContaining({
          id: expect.stringContaining("missing-id-"),
          severity: "critical",
          type: "verification",
          title: expect.stringMatching(/Government|ID/i),
        })
      );
    });

    it("should generate RED critical message when government ID back is missing", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: null,
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      expect(messages).toContainEqual(
        expect.objectContaining({
          severity: "critical",
          type: "verification",
          title: expect.stringMatching(/Government|ID/i),
        })
      );
    });

    it("should generate AMBER warning message when banking details are missing", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "APPROVED",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: null,
        bankAccountNumber: null,
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      expect(messages).toContainEqual(
        expect.objectContaining({
          severity: "warning",
          type: "banking",
          title: expect.stringMatching(/Banking|Bank/i),
        })
      );
    });

    it("should not include APPROVED verification status in messages", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "APPROVED",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      const verificationMessages = messages.filter(
        (m) => m.type === "verification_status"
      );
      expect(
        verificationMessages.some((m) => m.title.includes("Verified"))
      ).toBe(false);
    });

    it("should generate RED critical message when verification status is REJECTED", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "REJECTED",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: {
          reason: "Documents appear expired",
        },
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      const rejectedMsg = messages.find(
        (m) => m.type === "verification_status"
      );
      expect(rejectedMsg).toBeDefined();
      expect(rejectedMsg?.severity).toBe("critical");
      expect(rejectedMsg?.title).toMatch(/Rejected|Unable/i);
    });

    it("should filter out dismissed messages from results", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: null,
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock a dismissed message
      const dismissedMessageId = "missing-id-front";
      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([
        {
          id: "dismissal-1",
          userId: mockUserId,
          messageId: dismissedMessageId,
          dismissedAt: new Date(),
          createdAt: new Date(),
        },
      ]);

      const messages = await generateSystemMessages(
        mockVerification,
        1,
        mockUserId
      );

      // The missing ID message should not be in the returned messages
      expect(messages.find((m) => m.id === dismissedMessageId)).toBeUndefined();
    });

    it("should set autoHideSecs property to 3 for success messages", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John",
        bankAccountNumber: "12345",
        bankBranch: "Main",
        bankName: "Bank",
        bankSwiftCode: "SWIFT",
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate a success scenario (all docs complete, status APPROVED)
      const successVerification = {
        ...mockVerification,
        status: "APPROVED",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        successVerification,
        1,
        mockUserId
      );

      const successMessages = messages.filter((m) => m.severity === "success");
      successMessages.forEach((msg) => {
        if (msg.autoHideSecs) {
          expect(msg.autoHideSecs).toBe(3);
        }
      });
    });

    it("should not generate any messages when charterCount is 0", async () => {
      const mockVerification = {
        id: "v-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: null,
        idBack: null,
        captainLicense: null,
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: null,
        bankAccountNumber: null,
        bankBranch: null,
        bankName: null,
        bankSwiftCode: null,
        bankStatement: null,
        additional: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(
        mockVerification,
        0,
        mockUserId
      );

      expect(messages).toEqual([]);
      expect(prisma.messageDismissal.findMany).not.toHaveBeenCalled();
    });

    it("should return verification message when verification is null and charterCount > 0", async () => {
      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const messages = await generateSystemMessages(null, 1, mockUserId);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        id: "no-verification-record",
        type: "verification",
        severity: "critical",
        title: "Complete Account Verification",
        actionUrl: "/captain/documents",
      });
    });
  });

  describe("getDismissedMessages", () => {
    it("should return set of dismissed message IDs for user", async () => {
      const dismissals = [
        {
          id: "d-1",
          userId: mockUserId,
          messageId: "msg-1",
          dismissedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: "d-2",
          userId: mockUserId,
          messageId: "msg-2",
          dismissedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue(dismissals);

      const dismissed = await getDismissedMessages(mockUserId);

      expect(dismissed).toBeInstanceOf(Set);
      expect(dismissed.has("msg-1")).toBe(true);
      expect(dismissed.has("msg-2")).toBe(true);
      expect(dismissed.size).toBe(2);
    });

    it("should return empty set when no messages are dismissed", async () => {
      vi.mocked(prisma.messageDismissal.findMany).mockResolvedValue([]);

      const dismissed = await getDismissedMessages(mockUserId);

      expect(dismissed).toBeInstanceOf(Set);
      expect(dismissed.size).toBe(0);
    });
  });
});
