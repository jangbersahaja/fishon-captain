/**
 * Settings Service Tests
 *
 * Tests validation, caching, and audit logging for system settings
 */

import { DEFAULT_PROMO_SPLIT } from "@/types/settings";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getPromoSplitConfig,
  invalidatePromoSplitCache,
  updatePromoSplitConfig,
} from "../settings-service";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Mock audit logging
vi.mock("@/server/audit", () => ({
  auditWithDiff: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("settings-service", () => {
  beforeEach(() => {
    invalidatePromoSplitCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    invalidatePromoSplitCache();
  });

  describe("validatePromoSplitConfig", () => {
    it("should reject negative captain percentage", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);

      await expect(
        updatePromoSplitConfig(
          { captainPercent: -10, platformPercent: 110 },
          "user-1"
        )
      ).rejects.toThrow("Captain percentage must be between 0 and 100");
    });

    it("should reject negative platform percentage", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);

      await expect(
        updatePromoSplitConfig(
          { captainPercent: 50, platformPercent: -50 },
          "user-1"
        )
      ).rejects.toThrow("Platform percentage must be between 0 and 100");
    });

    it("should reject percentages over 100", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);

      await expect(
        updatePromoSplitConfig(
          { captainPercent: 150, platformPercent: -50 },
          "user-1"
        )
      ).rejects.toThrow("Captain percentage must be between 0 and 100");
    });

    it("should reject non-100% sums", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);

      await expect(
        updatePromoSplitConfig(
          { captainPercent: 50, platformPercent: 40 },
          "user-1"
        )
      ).rejects.toThrow("Percentages must sum to 100");
    });

    it("should accept valid 50/50 split", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 50.0, platformPercent: 50.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePromoSplitConfig(
        { captainPercent: 50, platformPercent: 50 },
        "user-1"
      );

      expect(result).toEqual({ captainPercent: 50.0, platformPercent: 50.0 });
    });

    it("should accept valid 70/30 split", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 70.0, platformPercent: 30.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePromoSplitConfig(
        { captainPercent: 70, platformPercent: 30 },
        "user-1"
      );

      expect(result).toEqual({ captainPercent: 70.0, platformPercent: 30.0 });
    });

    it("should round to one decimal place", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 33.3, platformPercent: 66.7 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePromoSplitConfig(
        { captainPercent: 33.33333, platformPercent: 66.66667 },
        "user-1"
      );

      expect(result.captainPercent).toBe(33.3);
      expect(result.platformPercent).toBe(66.7);
    });

    it("should accept 0/100 split (platform absorbs all)", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 0.0, platformPercent: 100.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePromoSplitConfig(
        { captainPercent: 0, platformPercent: 100 },
        "user-1"
      );

      expect(result).toEqual({ captainPercent: 0.0, platformPercent: 100.0 });
    });

    it("should accept 100/0 split (captain absorbs all)", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 100.0, platformPercent: 0.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await updatePromoSplitConfig(
        { captainPercent: 100, platformPercent: 0 },
        "user-1"
      );

      expect(result).toEqual({ captainPercent: 100.0, platformPercent: 0.0 });
    });
  });

  describe("getPromoSplitConfig", () => {
    it("should return default when no config exists", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);

      const result = await getPromoSplitConfig();

      expect(result).toEqual(DEFAULT_PROMO_SPLIT);
    });

    it("should load config from database", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 70.0, platformPercent: 30.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getPromoSplitConfig();

      expect(result).toEqual({ captainPercent: 70.0, platformPercent: 30.0 });
      expect(prisma.systemSettings.findUnique).toHaveBeenCalledWith({
        where: { key: "PROMO_SPLIT_CONFIG" },
      });
    });

    it("should cache results for 5 minutes", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 70.0, platformPercent: 30.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // First call - cache miss
      const result1 = await getPromoSplitConfig();
      expect(result1).toEqual({ captainPercent: 70.0, platformPercent: 30.0 });
      expect(prisma.systemSettings.findUnique).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await getPromoSplitConfig();
      expect(result2).toEqual({ captainPercent: 70.0, platformPercent: 30.0 });
      expect(prisma.systemSettings.findUnique).toHaveBeenCalledTimes(1); // Not called again

      // Third call - still cached
      const result3 = await getPromoSplitConfig();
      expect(result3).toEqual({ captainPercent: 70.0, platformPercent: 30.0 });
      expect(prisma.systemSettings.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should return default on database error", async () => {
      const { prisma } = await import("@/lib/prisma");
      vi.mocked(prisma.systemSettings.findUnique).mockRejectedValue(
        new Error("Database error")
      );

      const result = await getPromoSplitConfig();

      expect(result).toEqual(DEFAULT_PROMO_SPLIT);
    });
  });

  describe("updatePromoSplitConfig", () => {
    it("should write audit log with diff", async () => {
      const { prisma } = await import("@/lib/prisma");
      const { auditWithDiff } = await import("@/server/audit");

      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 50.0, platformPercent: 50.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 60.0, platformPercent: 40.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-2",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await updatePromoSplitConfig(
        { captainPercent: 60, platformPercent: 40 },
        "user-2"
      );

      expect(auditWithDiff).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "UPDATE_PROMO_SPLIT_CONFIG",
          actorUserId: "user-2",
          entityType: "charter",
          before: { captainPercent: 50.0, platformPercent: 50.0 },
          after: { captainPercent: 60.0, platformPercent: 40.0 },
        })
      );
    });

    it("should invalidate cache after update", async () => {
      const { prisma } = await import("@/lib/prisma");

      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.systemSettings.upsert).mockResolvedValue({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 60.0, platformPercent: 40.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Prime cache with different value
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValueOnce({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 50.0, platformPercent: 50.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await getPromoSplitConfig(); // Cache 50/50

      // Update to 60/40
      await updatePromoSplitConfig(
        { captainPercent: 60, platformPercent: 40 },
        "user-1"
      );

      // Next fetch should hit database again (cache invalidated)
      vi.mocked(prisma.systemSettings.findUnique).mockResolvedValueOnce({
        id: "setting-1",
        key: "PROMO_SPLIT_CONFIG",
        value: { captainPercent: 60.0, platformPercent: 40.0 },
        category: "PRICING",
        description: "Controls promo split",
        updatedBy: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getPromoSplitConfig();
      expect(result).toEqual({ captainPercent: 60.0, platformPercent: 40.0 });
    });
  });
});
