/**
 * Settings Service Layer
 *
 * Manages system-wide configuration settings with caching and validation.
 * Provides type-safe access to configuration values stored in the database.
 */

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { auditWithDiff } from "@/server/audit";
import type { PromoSplitConfig } from "@/types/settings";
import { DEFAULT_PROMO_SPLIT } from "@/types/settings";
import type { Prisma } from "@prisma/client";

// In-memory cache with 5-minute TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const promoSplitCache = new Map<string, CacheEntry<PromoSplitConfig>>();

/**
 * Get current promo split configuration with caching
 *
 * @returns PromoSplitConfig with captain and platform percentages
 *
 * @example
 * const config = await getPromoSplitConfig();
 * console.log(config); // { captainPercent: 50.0, platformPercent: 50.0 }
 */
export async function getPromoSplitConfig(): Promise<PromoSplitConfig> {
  const cacheKey = "PROMO_SPLIT_CONFIG";
  const cached = promoSplitCache.get(cacheKey);

  // Return cached if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug("Promo split config cache hit", { config: cached.data });
    return cached.data;
  }

  // Fetch from database
  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "PROMO_SPLIT_CONFIG" },
    });

    if (!setting) {
      logger.warn("Promo split config not found, using default", {
        default: DEFAULT_PROMO_SPLIT,
      });
      return DEFAULT_PROMO_SPLIT;
    }

    // Parse and validate JSON value
    const config = setting.value as unknown as PromoSplitConfig;

    // Validate and cache
    validatePromoSplitConfig(config);
    promoSplitCache.set(cacheKey, { data: config, timestamp: Date.now() });

    logger.debug("Promo split config loaded from database", { config });
    return config;
  } catch (error) {
    logger.error("Failed to load promo split config", { error });
    return DEFAULT_PROMO_SPLIT;
  }
}

/**
 * Update promo split configuration with validation and audit logging
 *
 * @param config - New promo split configuration
 * @param actorId - User ID making the change
 * @returns Updated PromoSplitConfig (rounded to one decimal place)
 * @throws Error if validation fails
 *
 * @example
 * const updated = await updatePromoSplitConfig(
 *   { captainPercent: 60, platformPercent: 40 },
 *   'user-123'
 * );
 */
export async function updatePromoSplitConfig(
  config: PromoSplitConfig,
  actorId: string
): Promise<PromoSplitConfig> {
  // Validate input
  validatePromoSplitConfig(config);

  // Round to one decimal place
  const roundedConfig: PromoSplitConfig = {
    captainPercent: Math.round(config.captainPercent * 10) / 10,
    platformPercent: Math.round(config.platformPercent * 10) / 10,
  };

  // Fetch current config for audit
  const currentSetting = await prisma.systemSettings.findUnique({
    where: { key: "PROMO_SPLIT_CONFIG" },
  });

  const previousConfig =
    currentSetting?.value as unknown as PromoSplitConfig | null;

  // Update database
  const updated = await prisma.systemSettings.upsert({
    where: { key: "PROMO_SPLIT_CONFIG" },
    create: {
      key: "PROMO_SPLIT_CONFIG",
      value: roundedConfig as unknown as Prisma.InputJsonValue,
      category: "PRICING",
      description:
        "Controls how promo discounts are split between captain and platform",
      updatedBy: actorId,
    },
    update: {
      value: roundedConfig as unknown as Prisma.InputJsonValue,
      updatedBy: actorId,
    },
  });

  // Write audit log
  await auditWithDiff({
    action: "UPDATE_PROMO_SPLIT_CONFIG",
    actorUserId: actorId,
    entityType: "charter", // Using closest matching type
    entityId: updated.id,
    before: previousConfig || DEFAULT_PROMO_SPLIT,
    after: roundedConfig,
  });

  // Invalidate cache
  invalidatePromoSplitCache();

  logger.info("Promo split config updated", {
    actorId,
    previous: previousConfig,
    updated: roundedConfig,
  });

  return roundedConfig;
}

/**
 * Invalidate promo split cache (called after updates)
 *
 * @example
 * invalidatePromoSplitCache();
 */
export function invalidatePromoSplitCache(): void {
  promoSplitCache.clear();
  logger.debug("Promo split cache invalidated");
}

/**
 * Validate promo split configuration
 *
 * Rules:
 * - Both percentages must be numbers
 * - Both must be between 0 and 100
 * - Sum must equal 100 (with 0.1 tolerance for rounding)
 *
 * @param config - Configuration to validate
 * @throws Error if validation fails
 *
 * @example
 * validatePromoSplitConfig({ captainPercent: 50, platformPercent: 50 }); // OK
 * validatePromoSplitConfig({ captainPercent: 110, platformPercent: -10 }); // Throws
 */
function validatePromoSplitConfig(config: PromoSplitConfig): void {
  const { captainPercent, platformPercent } = config;

  // Check types
  if (
    typeof captainPercent !== "number" ||
    typeof platformPercent !== "number"
  ) {
    throw new Error("Percentages must be numbers");
  }

  // Check range
  if (captainPercent < 0 || captainPercent > 100) {
    throw new Error("Captain percentage must be between 0 and 100");
  }

  if (platformPercent < 0 || platformPercent > 100) {
    throw new Error("Platform percentage must be between 0 and 100");
  }

  // Check sum (with tolerance for floating point rounding)
  const sum = Math.round((captainPercent + platformPercent) * 10) / 10;
  if (Math.abs(sum - 100.0) > 0.1) {
    throw new Error(
      `Percentages must sum to 100 (got ${sum}). Captain: ${captainPercent}%, Platform: ${platformPercent}%`
    );
  }
}
