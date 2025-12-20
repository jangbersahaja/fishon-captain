/**
 * System Settings Type Definitions
 *
 * Provides type-safe configuration management for system-wide settings
 * including promo split configuration, feature flags, and other global parameters.
 */

export interface PromoSplitConfig {
  captainPercent: number; // 0-100 with one decimal place
  platformPercent: number; // 0-100 with one decimal place
}

export const DEFAULT_PROMO_SPLIT: PromoSplitConfig = {
  captainPercent: 50.0,
  platformPercent: 50.0,
};

export interface SystemSettingsUpdate {
  key: string;
  value: unknown;
  updatedBy: string;
}

/**
 * System setting categories for organization
 */
export enum SettingsCategory {
  PRICING = "PRICING",
  FEATURES = "FEATURES",
  NOTIFICATIONS = "NOTIFICATIONS",
  INTEGRATIONS = "INTEGRATIONS",
  SECURITY = "SECURITY",
}

/**
 * Known system setting keys (for type safety)
 */
export const SYSTEM_SETTING_KEYS = {
  PROMO_SPLIT_CONFIG: "PROMO_SPLIT_CONFIG",
} as const;

export type SystemSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];
