/**
 * Verification Status Service Tests
 * TDD tests for verification status querying
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    captainVerification: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getVerificationStatus } from "../verification-status";

describe("Verification Status Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getVerificationStatus", () => {
    it("should return verification when it exists for user", async () => {
      const mockVerification = {
        id: "verification-1",
        userId: mockUserId,
        status: "APPROVED",
        idFront: { url: "https://example.com/id-front.jpg" },
        idBack: { url: "https://example.com/id-back.jpg" },
        captainLicense: { url: "https://example.com/license.jpg" },
        boatRegistration: null,
        fishingLicense: null,
        bankAccountHolder: "John Doe",
        bankAccountNumber: "1234567890",
        bankBranch: "Main Branch",
        bankName: "Bank of Malaysia",
        bankSwiftCode: "BOFMMY",
        bankStatement: null,
        additional: [],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-15"),
      };

      vi.mocked(prisma.captainVerification.findUnique).mockResolvedValue(
        mockVerification
      );

      const result = await getVerificationStatus(mockUserId);

      expect(result).toEqual(mockVerification);
      expect(prisma.captainVerification.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it("should return null when verification does not exist for user", async () => {
      vi.mocked(prisma.captainVerification.findUnique).mockResolvedValue(null);

      const result = await getVerificationStatus(mockUserId);

      expect(result).toBeNull();
      expect(prisma.captainVerification.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it("should include all verification fields in response", async () => {
      const mockVerification = {
        id: "verification-1",
        userId: mockUserId,
        status: "PENDING",
        idFront: null,
        idBack: null,
        captainLicense: null,
        boatRegistration: { url: "https://example.com/boat.jpg" },
        fishingLicense: null,
        bankAccountHolder: null,
        bankAccountNumber: null,
        bankBranch: null,
        bankName: null,
        bankSwiftCode: null,
        bankStatement: null,
        additional: [{ type: "PHOTO", url: "https://example.com/photo.jpg" }],
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      vi.mocked(prisma.captainVerification.findUnique).mockResolvedValue(
        mockVerification
      );

      const result = await getVerificationStatus(mockUserId);

      expect(result).toBeDefined();
      expect(result?.id).toBe("verification-1");
      expect(result?.status).toBe("PENDING");
      expect(result?.idFront).toBeNull();
      expect(result?.idBack).toBeNull();
      expect(result?.boatRegistration).toEqual({
        url: "https://example.com/boat.jpg",
      });
      expect(result?.additional).toEqual([
        { type: "PHOTO", url: "https://example.com/photo.jpg" },
      ]);
      expect(result?.bankAccountHolder).toBeNull();
    });
  });
});
