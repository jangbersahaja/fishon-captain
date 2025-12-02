/**
 * Referral Programme Constants
 *
 * Configuration values for the Captain Affiliate Programme.
 * These can be overridden by environment variables where applicable.
 */

export const REFERRAL_CONSTANTS = {
  // Commission settings
  COMMISSION_RATE: 0.1, // 10%
  COMMISSION_CAP: 100, // RM 100 maximum per referral

  // Expiry settings (in days)
  REGISTRATION_EXPIRY_DAYS: 30, // Days to register after clicking link
  TRIP_EXPIRY_DAYS: 90, // Days to complete first trip after registration

  // Code generation settings
  CODE_MIN_LENGTH: 3, // Minimum base name length
  CODE_MAX_LENGTH: 10, // Maximum base name length (before suffix)
  CODE_SUFFIX_LENGTH: 4, // Random suffix length
  CODE_FALLBACK_BASE: "REF", // Fallback if name is too short

  // Characters for random suffix (excludes confusing chars: 0, O, 1, I, L)
  SUFFIX_CHARS: "23456789ABCDEFGHJKMNPQRSTUVWXYZ",

  // Title prefixes to strip from captain names
  TITLE_PREFIXES_TO_STRIP: [
    "captain",
    "kapten",
    "capt",
    "cpt",
    "skipper",
    "nakhoda",
  ],

  // Rate limiting
  MAX_CODE_GENERATION_ATTEMPTS: 10,
  CLICK_COOLDOWN_MINUTES: 5, // Minimum time between clicks from same IP

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 50,
} as const;

/**
 * Referral share URL base
 * This is the URL where new captains will register
 */
export function getReferralShareUrl(code: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://captain.fishon.my";
  return `${baseUrl}/join?ref=${code}`;
}

/**
 * Calculate referral commission with cap
 *
 * @param captainEarnings - The captain's earnings from the trip
 * @returns Commission amount (capped at COMMISSION_CAP)
 */
export function calculateReferralCommission(captainEarnings: number): number {
  const commission = captainEarnings * REFERRAL_CONSTANTS.COMMISSION_RATE;
  return Math.min(commission, REFERRAL_CONSTANTS.COMMISSION_CAP);
}

/**
 * Calculate registration expiry date from click time
 */
export function getRegistrationExpiryDate(clickedAt: Date = new Date()): Date {
  const expiry = new Date(clickedAt);
  expiry.setDate(
    expiry.getDate() + REFERRAL_CONSTANTS.REGISTRATION_EXPIRY_DAYS
  );
  return expiry;
}

/**
 * Calculate trip completion expiry date from registration time
 */
export function getTripExpiryDate(registeredAt: Date = new Date()): Date {
  const expiry = new Date(registeredAt);
  expiry.setDate(expiry.getDate() + REFERRAL_CONSTANTS.TRIP_EXPIRY_DAYS);
  return expiry;
}

export type ReferralCodeGenerationResult = {
  success: boolean;
  code?: string;
  error?: string;
};
