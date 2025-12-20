/**
 * Integration Tests: Pricing Service with Promo Split
 *
 * Tests pricing calculations with various promo split configurations
 * to ensure captain earnings adjust correctly.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculatePricing } from "../pricing-service";

// Mock settings service
vi.mock("../settings-service", () => ({
  getPromoSplitConfig: vi.fn(),
}));

describe("Pricing Service Integration - Promo Split", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("50/50 Split (Default)", () => {
    it("should split RM100 discount evenly", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      expect(result.captainPromoContribution).toBe(50); // Captain pays RM50
      expect(result.platformPromoContribution).toBe(50); // Platform pays RM50
      expect(result.captainEarnings).toBe(950); // 1000 - 50
      expect(result.discount).toBe(100);
    });

    it("should handle multi-day booking with discount", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 500,
        days: 3,
        promoDiscount: 150, // RM150 total discount
      });

      expect(result.subtotal).toBe(1500); // 500 × 3
      expect(result.captainPromoContribution).toBe(75); // 50% of 150
      expect(result.platformPromoContribution).toBe(75);
      expect(result.captainEarnings).toBe(1425); // 1500 - 75
    });
  });

  describe("70/30 Split (Captain-Heavy)", () => {
    it("should apply 70/30 split to RM100 discount", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 70.0,
        platformPercent: 30.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      expect(result.captainPromoContribution).toBe(70); // Captain pays RM70
      expect(result.platformPromoContribution).toBe(30); // Platform pays RM30
      expect(result.captainEarnings).toBe(930); // 1000 - 70
    });

    it("should handle RM200 discount with 70/30 split", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 70.0,
        platformPercent: 30.0,
      });

      const result = await calculatePricing({
        tripPrice: 2000,
        days: 1,
        promoDiscount: 200,
      });

      expect(result.captainPromoContribution).toBe(140); // 70% of 200
      expect(result.platformPromoContribution).toBe(60); // 30% of 200
      expect(result.captainEarnings).toBe(1860); // 2000 - 140
    });
  });

  describe("0/100 Split (Platform Absorbs All)", () => {
    it("should have captain pay nothing", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 0.0,
        platformPercent: 100.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      expect(result.captainPromoContribution).toBe(0); // Captain pays nothing
      expect(result.platformPromoContribution).toBe(100); // Platform pays all
      expect(result.captainEarnings).toBe(1000); // Full price (unchanged)
    });

    it("should work with large discounts", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 0.0,
        platformPercent: 100.0,
      });

      const result = await calculatePricing({
        tripPrice: 500,
        days: 2,
        promoDiscount: 300, // Large discount
      });

      expect(result.subtotal).toBe(1000);
      expect(result.captainPromoContribution).toBe(0);
      expect(result.platformPromoContribution).toBe(300);
      expect(result.captainEarnings).toBe(1000); // Full earnings
    });
  });

  describe("100/0 Split (Captain Absorbs All)", () => {
    it("should have captain pay full discount", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 100.0,
        platformPercent: 0.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      expect(result.captainPromoContribution).toBe(100); // Captain pays all
      expect(result.platformPromoContribution).toBe(0); // Platform pays nothing
      expect(result.captainEarnings).toBe(900); // 1000 - 100
    });

    it("should handle edge case of discount = trip price", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 100.0,
        platformPercent: 0.0,
      });

      const result = await calculatePricing({
        tripPrice: 100,
        days: 1,
        promoDiscount: 100, // Full discount
      });

      expect(result.captainPromoContribution).toBe(100);
      expect(result.platformPromoContribution).toBe(0);
      expect(result.captainEarnings).toBe(0); // Captain gets nothing
    });
  });

  describe("33.3/66.7 Split (Fractional)", () => {
    it("should handle decimal percentages", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 33.3,
        platformPercent: 66.7,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      expect(result.captainPromoContribution).toBe(33.3); // 33.3% of 100
      expect(result.platformPromoContribution).toBe(66.7); // 66.7% of 100
      expect(result.captainEarnings).toBe(966.7); // 1000 - 33.3
    });
  });

  describe("No Discount Applied", () => {
    it("should have zero contributions when no promo", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 0, // No discount
      });

      expect(result.captainPromoContribution).toBe(0);
      expect(result.platformPromoContribution).toBe(0);
      expect(result.captainEarnings).toBe(1000); // Full price
    });

    it("should work without promoDiscount parameter", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        // promoDiscount omitted
      });

      expect(result.captainPromoContribution).toBe(0);
      expect(result.platformPromoContribution).toBe(0);
      expect(result.captainEarnings).toBe(1000);
    });
  });

  describe("Revenue Equation Balance", () => {
    it("should maintain revenue balance with 50/50 split", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      // Revenue check: captain earnings + platform commission
      const captainRevenue = result.captainEarnings; // 950
      const platformRevenue =
        result.platformFee +
        result.serviceFee -
        result.platformPromoContribution;
      // Platform: 100 (fee) + ~18 (service) - 50 (promo) = ~68

      expect(captainRevenue).toBe(950);
      expect(result.platformFee).toBe(100); // Capped at RM100
      expect(result.platformPromoContribution).toBe(50);
    });

    it("should maintain revenue balance with 70/30 split", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 70.0,
        platformPercent: 30.0,
      });

      const result = await calculatePricing({
        tripPrice: 1000,
        days: 1,
        promoDiscount: 100,
      });

      const captainRevenue = result.captainEarnings; // 930
      const captainContribution = result.captainPromoContribution; // 70
      const platformContribution = result.platformPromoContribution; // 30

      expect(captainRevenue).toBe(930);
      expect(captainContribution + platformContribution).toBe(100); // Total discount
    });
  });

  describe("Platform Fee Cap with Split", () => {
    it("should cap platform fee at RM100 regardless of split", async () => {
      const { getPromoSplitConfig } = await import("../settings-service");
      vi.mocked(getPromoSplitConfig).mockResolvedValue({
        captainPercent: 50.0,
        platformPercent: 50.0,
      });

      const result = await calculatePricing({
        tripPrice: 2000, // Would be RM200 without cap
        days: 1,
        promoDiscount: 200,
      });

      expect(result.platformFee).toBe(100); // Capped!
      expect(result.captainPromoContribution).toBe(100); // 50% of 200
      expect(result.platformPromoContribution).toBe(100);
      expect(result.captainEarnings).toBe(1900); // 2000 - 100
    });
  });
});
