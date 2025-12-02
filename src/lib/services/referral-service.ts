/**
 * Referral Service
 *
 * Core business logic for the Captain Affiliate Programme.
 * Handles referral code generation, tracking, validation, and commission calculation.
 */

import {
  calculateReferralCommission,
  getReferralShareUrl,
  getRegistrationExpiryDate,
  getTripExpiryDate,
  REFERRAL_CONSTANTS,
} from "@/lib/constants/referral";
import { prisma } from "@/lib/prisma";
import type {
  Referral,
  ReferralCode,
  ReferralEarning,
  ReferralStatus,
} from "@prisma/client";
import crypto from "crypto";

// ============================================
// TYPES
// ============================================

export interface ReferralCodeWithStats extends ReferralCode {
  stats: {
    clicks: number;
    signups: number;
    chartersCreated: number;
    completedTrips: number;
    totalEarnings: number;
    pendingEarnings: number;
  };
  shareUrl: string;
}

export interface ReferralWithDetails extends Referral {
  invitee?: {
    id: string;
    name: string | null;
    email: string;
    captainProfile?: {
      displayName: string;
    } | null;
  } | null;
  earning?: ReferralEarning | null;
}

export interface ReferralsSummary {
  pending: number;
  registered: number;
  charterCreated: number;
  firstBooking: number;
  completed: number;
  paid: number;
  expired: number;
  total: number;
}

export interface ReferralEarningsSummary {
  totalEarned: number;
  totalPending: number;
  totalPaid: number;
  totalReversed: number;
}

export interface ValidateReferralResult {
  valid: boolean;
  error?:
    | "INVALID"
    | "EXPIRED"
    | "INACTIVE"
    | "SELF_REFERRAL"
    | "ALREADY_REGISTERED"
    | "DUPLICATE_CLICK"
    | "RATE_LIMITED";
  invitor?: {
    id: string;
    name: string;
    charterCount: number;
  };
  referralCodeId?: string;
}

export interface FraudCheckResult {
  allowed: boolean;
  reason?: "DUPLICATE_IP" | "COOLDOWN_ACTIVE" | "SUSPICIOUS_PATTERN";
  duplicateCount?: number;
  lastClickAt?: Date;
}

// ============================================
// REFERRAL CODE GENERATION
// ============================================

/**
 * Words to strip from captain names when generating referral codes
 * Case-insensitive matching
 */
const TITLE_PREFIXES_TO_STRIP = REFERRAL_CONSTANTS.TITLE_PREFIXES_TO_STRIP;

/**
 * Clean and normalize a captain's display name for referral code
 *
 * Rules:
 * 1. Remove common title prefixes (Captain, Kapten, etc.)
 * 2. Remove special characters and numbers
 * 3. Remove spaces (concatenate words)
 * 4. Convert to uppercase
 * 5. Limit to max 10 characters (before suffix)
 * 6. Ensure minimum 3 characters
 */
export function cleanNameForReferralCode(displayName: string): string {
  let cleaned = displayName.trim().toLowerCase();

  // Remove title prefixes
  for (const prefix of TITLE_PREFIXES_TO_STRIP) {
    // Match prefix at start of string or as a word
    const regexStart = new RegExp(`^${prefix}\\s*`, "gi");
    const regexMiddle = new RegExp(`\\s+${prefix}\\s+`, "gi");
    cleaned = cleaned.replace(regexStart, "").replace(regexMiddle, " ");
  }

  // Remove special characters, numbers, and extra spaces
  cleaned = cleaned
    .replace(/[^a-z\s]/g, "") // Keep only letters and spaces
    .replace(/\s+/g, "") // Remove all spaces (concatenate)
    .trim();

  // Convert to uppercase
  cleaned = cleaned.toUpperCase();

  // Ensure minimum length (fallback to "REF" if too short)
  if (cleaned.length < REFERRAL_CONSTANTS.CODE_MIN_LENGTH) {
    cleaned = REFERRAL_CONSTANTS.CODE_FALLBACK_BASE;
  }

  // Limit maximum length (before suffix)
  if (cleaned.length > REFERRAL_CONSTANTS.CODE_MAX_LENGTH) {
    cleaned = cleaned.substring(0, REFERRAL_CONSTANTS.CODE_MAX_LENGTH);
  }

  return cleaned;
}

/**
 * Generate a random alphanumeric suffix
 * Uses only easily distinguishable characters (no 0/O, 1/I/L confusion)
 */
export function generateRandomSuffix(
  length: number = REFERRAL_CONSTANTS.CODE_SUFFIX_LENGTH
): string {
  const chars = REFERRAL_CONSTANTS.SUFFIX_CHARS;
  let suffix = "";
  for (let i = 0; i < length; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return suffix;
}

/**
 * Generate a unique, personalized referral code for a captain
 */
export async function generateReferralCode(
  displayName: string
): Promise<string> {
  const baseName = cleanNameForReferralCode(displayName);
  let code: string;
  let attempts = 0;

  do {
    const suffix = generateRandomSuffix();
    code = `${baseName}${suffix}`;
    attempts++;

    // Check if code already exists
    const existing = await prisma.referralCode.findUnique({
      where: { code },
    });

    if (!existing) break;
  } while (attempts < REFERRAL_CONSTANTS.MAX_CODE_GENERATION_ATTEMPTS);

  // Fallback: add timestamp component
  if (attempts >= REFERRAL_CONSTANTS.MAX_CODE_GENERATION_ATTEMPTS) {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    code = `${baseName}${timestamp}`;
  }

  return code;
}

// ============================================
// REFERRAL CODE MANAGEMENT
// ============================================

export interface ReferralEligibility {
  eligible: boolean;
  reason?: "NO_CAPTAIN_PROFILE" | "NO_ACTIVE_CHARTER" | "NOT_CAPTAIN_ROLE";
  charterCount?: number;
}

/**
 * Check if a user is eligible to participate in the referral programme
 * Requirements: Must be a captain with at least one active charter
 */
export async function checkReferralEligibility(
  userId: string
): Promise<ReferralEligibility> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      captainProfile: true,
      ownedCharters: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return { eligible: false, reason: "NO_CAPTAIN_PROFILE" };
  }

  // Must have CAPTAIN role (STAFF/ADMIN are not eligible unless they're also captains)
  if (user.role !== "CAPTAIN") {
    return { eligible: false, reason: "NOT_CAPTAIN_ROLE" };
  }

  // Must have a captain profile
  if (!user.captainProfile) {
    return { eligible: false, reason: "NO_CAPTAIN_PROFILE" };
  }

  // Must have at least one active charter
  if (user.ownedCharters.length === 0) {
    return { eligible: false, reason: "NO_ACTIVE_CHARTER", charterCount: 0 };
  }

  return {
    eligible: true,
    charterCount: user.ownedCharters.length,
  };
}

/**
 * Get or create a referral code for a captain
 * Throws error if user is not eligible
 */
export async function getOrCreateReferralCode(
  userId: string
): Promise<ReferralCodeWithStats> {
  // Check if user already has a referral code
  let referralCode = await prisma.referralCode.findUnique({
    where: { ownerId: userId },
    include: {
      referrals: {
        include: {
          earning: true,
        },
      },
    },
  });

  // If no code exists, check eligibility and create one
  if (!referralCode) {
    // Check eligibility before creating
    const eligibility = await checkReferralEligibility(userId);
    if (!eligibility.eligible) {
      throw new Error(`NOT_ELIGIBLE:${eligibility.reason}`);
    }

    // Get user's display name
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        captainProfile: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const displayName =
      user.captainProfile?.displayName || user.name || user.email.split("@")[0];
    const code = await generateReferralCode(displayName);

    referralCode = await prisma.referralCode.create({
      data: {
        code,
        ownerId: userId,
      },
      include: {
        referrals: {
          include: {
            earning: true,
          },
        },
      },
    });
  }

  // Calculate stats
  const stats = calculateReferralStats(referralCode.referrals);

  return {
    ...referralCode,
    stats,
    shareUrl: getReferralShareUrl(referralCode.code),
  };
}

/**
 * Get referral code by code string
 */
export async function getReferralCodeByCode(
  code: string
): Promise<ReferralCode | null> {
  return prisma.referralCode.findUnique({
    where: { code: code.toUpperCase() },
  });
}

/**
 * Calculate stats from referrals
 */
function calculateReferralStats(
  referrals: (Referral & { earning: ReferralEarning | null })[]
): ReferralCodeWithStats["stats"] {
  const stats = {
    clicks: 0,
    signups: 0,
    chartersCreated: 0,
    completedTrips: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
  };

  for (const referral of referrals) {
    stats.clicks++;

    if (
      referral.status !== "PENDING" &&
      referral.status !== "EXPIRED" &&
      referral.status !== "INVALID"
    ) {
      stats.signups++;
    }

    if (
      referral.status === "CHARTER_CREATED" ||
      referral.status === "FIRST_BOOKING" ||
      referral.status === "COMPLETED" ||
      referral.status === "PAID"
    ) {
      stats.chartersCreated++;
    }

    if (referral.status === "COMPLETED" || referral.status === "PAID") {
      stats.completedTrips++;
    }

    if (referral.earning) {
      const amount = Number(referral.earning.commissionAmount);
      stats.totalEarnings += amount;

      if (
        referral.earning.status === "PENDING" ||
        referral.earning.status === "SCHEDULED"
      ) {
        stats.pendingEarnings += amount;
      }
    }
  }

  return stats;
}

// ============================================
// REFERRAL VALIDATION & TRACKING
// ============================================

/**
 * Validate a referral code
 */
export async function validateReferralCode(
  code: string,
  checkEmail?: string,
  checkUserId?: string
): Promise<ValidateReferralResult> {
  const referralCode = await prisma.referralCode.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      owner: {
        include: {
          captainProfile: true,
          ownedCharters: {
            where: { isActive: true },
          },
        },
      },
    },
  });

  // Check if code exists
  if (!referralCode) {
    return { valid: false, error: "INVALID" };
  }

  // Check if code is active
  if (!referralCode.isActive) {
    return { valid: false, error: "INACTIVE" };
  }

  // Check for self-referral by user ID
  if (checkUserId && referralCode.ownerId === checkUserId) {
    return { valid: false, error: "SELF_REFERRAL" };
  }

  // Check for self-referral by email
  if (checkEmail && referralCode.owner.email === checkEmail.toLowerCase()) {
    return { valid: false, error: "SELF_REFERRAL" };
  }

  // Check if email is already registered
  if (checkEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: checkEmail.toLowerCase() },
    });

    if (existingUser) {
      return { valid: false, error: "ALREADY_REGISTERED" };
    }
  }

  return {
    valid: true,
    invitor: {
      id: referralCode.ownerId,
      name:
        referralCode.owner.captainProfile?.displayName ||
        referralCode.owner.name ||
        "Captain",
      charterCount: referralCode.owner.ownedCharters.length,
    },
    referralCodeId: referralCode.id,
  };
}

/**
 * Hash an IP address for privacy
 */
export function hashIpAddress(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

// ============================================
// FRAUD DETECTION
// ============================================

/**
 * Check for duplicate clicks from the same IP within cooldown period
 */
export async function checkDuplicateClick(
  referralCodeId: string,
  hashedIp: string
): Promise<FraudCheckResult> {
  const cooldownMinutes = REFERRAL_CONSTANTS.CLICK_COOLDOWN_MINUTES;
  const cooldownTime = new Date(Date.now() - cooldownMinutes * 60 * 1000);

  // Check for recent clicks from same IP on same referral code
  const recentClick = await prisma.referral.findFirst({
    where: {
      referralCodeId,
      sourceIp: hashedIp,
      clickedAt: { gte: cooldownTime },
    },
    orderBy: { clickedAt: "desc" },
  });

  if (recentClick) {
    return {
      allowed: false,
      reason: "COOLDOWN_ACTIVE",
      lastClickAt: recentClick.clickedAt,
    };
  }

  // Check for suspicious pattern: too many clicks from same IP across all codes
  const suspiciousThreshold = 20; // Max clicks from same IP in 24 hours
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const clicksFromIp = await prisma.referral.count({
    where: {
      sourceIp: hashedIp,
      clickedAt: { gte: dayAgo },
    },
  });

  if (clicksFromIp >= suspiciousThreshold) {
    return {
      allowed: false,
      reason: "SUSPICIOUS_PATTERN",
      duplicateCount: clicksFromIp,
    };
  }

  // Check for duplicate clicks on same code (any time)
  const duplicateCount = await prisma.referral.count({
    where: {
      referralCodeId,
      sourceIp: hashedIp,
    },
  });

  // Allow but track duplicates
  return {
    allowed: true,
    duplicateCount,
  };
}

/**
 * Mark a referral as invalid (fraud detected)
 */
export async function markReferralInvalid(params: {
  referralId: string;
  reason: string;
  flaggedBy: string;
}): Promise<Referral> {
  return prisma.referral.update({
    where: { id: params.referralId },
    data: {
      status: "INVALID",
      flagReason: params.reason,
      flaggedAt: new Date(),
      flaggedBy: params.flaggedBy,
    },
  });
}

/**
 * Bulk mark referrals as invalid
 */
export async function bulkMarkReferralsInvalid(params: {
  referralIds: string[];
  reason: string;
  flaggedBy: string;
}): Promise<number> {
  const result = await prisma.referral.updateMany({
    where: {
      id: { in: params.referralIds },
      status: { notIn: ["COMPLETED", "PAID"] }, // Don't invalidate completed referrals
    },
    data: {
      status: "INVALID",
      flagReason: params.reason,
      flaggedAt: new Date(),
      flaggedBy: params.flaggedBy,
    },
  });

  return result.count;
}

/**
 * Get suspicious referrals for review
 */
export async function getSuspiciousReferrals(): Promise<{
  duplicateIps: Array<{
    sourceIp: string;
    count: number;
    referralIds: string[];
  }>;
  rapidClicks: Array<{
    referralCodeId: string;
    code: string;
    clicksLastHour: number;
  }>;
}> {
  // Find IPs with multiple PENDING referrals (potential spam)
  const duplicateIps = await prisma.referral.groupBy({
    by: ["sourceIp"],
    where: {
      status: "PENDING",
      sourceIp: { not: null },
    },
    _count: { id: true },
    having: {
      id: { _count: { gt: 3 } },
    },
  });

  // Get referral IDs for each duplicate IP
  const duplicateIpDetails = await Promise.all(
    duplicateIps.map(async (ip) => {
      const referrals = await prisma.referral.findMany({
        where: {
          sourceIp: ip.sourceIp,
          status: "PENDING",
        },
        select: { id: true },
      });
      return {
        sourceIp: ip.sourceIp!,
        count: ip._count.id,
        referralIds: referrals.map((r) => r.id),
      };
    })
  );

  // Find codes with unusually high click rates in last hour
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rapidClickCodes = await prisma.referral.groupBy({
    by: ["referralCodeId"],
    where: {
      clickedAt: { gte: hourAgo },
    },
    _count: { id: true },
    having: {
      id: { _count: { gt: 10 } }, // More than 10 clicks per hour is suspicious
    },
  });

  const rapidClickDetails = await Promise.all(
    rapidClickCodes.map(async (rc) => {
      const code = await prisma.referralCode.findUnique({
        where: { id: rc.referralCodeId },
        select: { code: true },
      });
      return {
        referralCodeId: rc.referralCodeId,
        code: code?.code || "Unknown",
        clicksLastHour: rc._count.id,
      };
    })
  );

  return {
    duplicateIps: duplicateIpDetails,
    rapidClicks: rapidClickDetails,
  };
}

/**
 * Track a referral click with fraud detection
 */
export async function trackReferralClick(params: {
  code: string;
  sourceIp?: string;
  sourceUserAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}): Promise<{
  referralId: string;
  invitorName: string;
  expiresAt: Date;
  fraudCheck?: FraudCheckResult;
} | null> {
  const referralCode = await prisma.referralCode.findUnique({
    where: { code: params.code.toUpperCase() },
    include: {
      owner: {
        include: {
          captainProfile: true,
        },
      },
    },
  });

  if (!referralCode || !referralCode.isActive) {
    return null;
  }

  const hashedIp = params.sourceIp ? hashIpAddress(params.sourceIp) : null;

  // Fraud detection
  let fraudCheck: FraudCheckResult | undefined;
  if (hashedIp) {
    fraudCheck = await checkDuplicateClick(referralCode.id, hashedIp);
    if (!fraudCheck.allowed) {
      // Return null to indicate click was rejected
      return null;
    }
  }

  const expiresAt = getRegistrationExpiryDate();

  // Create referral record
  const referral = await prisma.referral.create({
    data: {
      referralCodeId: referralCode.id,
      invitorId: referralCode.ownerId,
      sourceIp: hashedIp,
      sourceUserAgent: params.sourceUserAgent,
      utmSource: params.utmSource,
      utmMedium: params.utmMedium,
      utmCampaign: params.utmCampaign,
      expiresAt,
      status: "PENDING",
    },
  });

  // Increment click count
  await prisma.referralCode.update({
    where: { id: referralCode.id },
    data: {
      clickCount: { increment: 1 },
    },
  });

  return {
    referralId: referral.id,
    invitorName:
      referralCode.owner.captainProfile?.displayName ||
      referralCode.owner.name ||
      "Captain",
    expiresAt,
    fraudCheck,
  };
}

// ============================================
// REFERRAL STATUS UPDATES
// ============================================

/**
 * Update referral when invitee registers
 */
export async function onInviteeRegistered(params: {
  referralId: string;
  inviteeId: string;
  inviteeEmail: string;
}): Promise<Referral> {
  const referral = await prisma.referral.update({
    where: { id: params.referralId },
    data: {
      inviteeId: params.inviteeId,
      inviteeEmail: params.inviteeEmail.toLowerCase(),
      registeredAt: new Date(),
      status: "REGISTERED",
      expiresAt: getTripExpiryDate(), // Extend expiry for trip completion
    },
  });

  // Increment signup count on referral code
  await prisma.referralCode.update({
    where: { id: referral.referralCodeId },
    data: {
      signupCount: { increment: 1 },
    },
  });

  // Update the referred user's referredById field
  await prisma.user.update({
    where: { id: params.inviteeId },
    data: {
      referredById: referral.invitorId,
    },
  });

  return referral;
}

/**
 * Update referral when invitee creates their first charter
 */
export async function onInviteeCharterCreated(params: {
  inviteeId: string;
  charterId: string;
}): Promise<Referral | null> {
  // Find the referral for this invitee
  const referral = await prisma.referral.findUnique({
    where: { inviteeId: params.inviteeId },
  });

  if (!referral || referral.status !== "REGISTERED") {
    return null;
  }

  return prisma.referral.update({
    where: { id: referral.id },
    data: {
      firstCharterId: params.charterId,
      firstCharterAt: new Date(),
      status: "CHARTER_CREATED",
    },
  });
}

/**
 * Update referral when invitee receives their first booking
 */
export async function onInviteeFirstBooking(params: {
  inviteeId: string;
  bookingId: string;
}): Promise<Referral | null> {
  // Find the referral for this invitee
  const referral = await prisma.referral.findUnique({
    where: { inviteeId: params.inviteeId },
  });

  if (
    !referral ||
    (referral.status !== "CHARTER_CREATED" && referral.status !== "REGISTERED")
  ) {
    return null;
  }

  return prisma.referral.update({
    where: { id: referral.id },
    data: {
      firstBookingId: params.bookingId,
      status: "FIRST_BOOKING",
    },
  });
}

/**
 * Process referral commission when invitee's first trip is completed
 */
export async function onInviteeFirstTripCompleted(params: {
  inviteeId: string;
  bookingId: string;
  captainEarnings: number;
}): Promise<ReferralEarning | null> {
  // Find the referral for this invitee
  const referral = await prisma.referral.findUnique({
    where: { inviteeId: params.inviteeId },
    include: {
      earning: true,
    },
  });

  // Only process if referral exists and hasn't already been completed
  if (!referral || referral.earning) {
    return null;
  }

  // Check if referral has expired
  if (new Date() > referral.expiresAt) {
    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: "EXPIRED" },
    });
    return null;
  }

  // Calculate commission
  const commissionAmount = calculateReferralCommission(params.captainEarnings);

  // Create earning record and update referral status in transaction
  const earning = await prisma.$transaction(async (tx) => {
    const newEarning = await tx.referralEarning.create({
      data: {
        referralId: referral.id,
        earnerId: referral.invitorId,
        bookingId: params.bookingId,
        tripEarnings: params.captainEarnings,
        commissionRate: REFERRAL_CONSTANTS.COMMISSION_RATE,
        commissionAmount,
        commissionCap: REFERRAL_CONSTANTS.COMMISSION_CAP,
        status: "PENDING",
      },
    });

    await tx.referral.update({
      where: { id: referral.id },
      data: {
        completedAt: new Date(),
        status: "COMPLETED",
        firstBookingId: params.bookingId,
      },
    });

    return newEarning;
  });

  return earning;
}

// ============================================
// REFERRAL QUERIES
// ============================================

/**
 * Get referrals for a captain (invitor)
 */
export async function getReferralsByInvitor(params: {
  invitorId: string;
  status?: ReferralStatus | "all";
  page?: number;
  limit?: number;
}): Promise<{
  referrals: ReferralWithDetails[];
  total: number;
  summary: ReferralsSummary;
}> {
  const page = params.page || 1;
  const limit = Math.min(
    params.limit || REFERRAL_CONSTANTS.DEFAULT_PAGE_SIZE,
    REFERRAL_CONSTANTS.MAX_PAGE_SIZE
  );
  const skip = (page - 1) * limit;

  const where: { invitorId: string; status?: ReferralStatus } = {
    invitorId: params.invitorId,
  };

  if (params.status && params.status !== "all") {
    where.status = params.status;
  }

  const [referrals, total, allReferrals] = await Promise.all([
    prisma.referral.findMany({
      where,
      include: {
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
            captainProfile: {
              select: {
                displayName: true,
              },
            },
          },
        },
        earning: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where: { invitorId: params.invitorId },
      select: { status: true },
    }),
  ]);

  // Calculate summary
  const summary: ReferralsSummary = {
    pending: 0,
    registered: 0,
    charterCreated: 0,
    firstBooking: 0,
    completed: 0,
    paid: 0,
    expired: 0,
    total: allReferrals.length,
  };

  for (const ref of allReferrals) {
    switch (ref.status) {
      case "PENDING":
        summary.pending++;
        break;
      case "REGISTERED":
        summary.registered++;
        break;
      case "CHARTER_CREATED":
        summary.charterCreated++;
        break;
      case "FIRST_BOOKING":
        summary.firstBooking++;
        break;
      case "COMPLETED":
        summary.completed++;
        break;
      case "PAID":
        summary.paid++;
        break;
      case "EXPIRED":
      case "INVALID":
        summary.expired++;
        break;
    }
  }

  return { referrals, total, summary };
}

/**
 * Get referral earnings for a captain
 */
export async function getReferralEarnings(params: {
  earnerId: string;
  status?: "PENDING" | "SCHEDULED" | "PAID" | "REVERSED" | "all";
  page?: number;
  limit?: number;
}): Promise<{
  earnings: (ReferralEarning & { referral: ReferralWithDetails })[];
  total: number;
  summary: ReferralEarningsSummary;
}> {
  const page = params.page || 1;
  const limit = Math.min(
    params.limit || REFERRAL_CONSTANTS.DEFAULT_PAGE_SIZE,
    REFERRAL_CONSTANTS.MAX_PAGE_SIZE
  );
  const skip = (page - 1) * limit;

  const where: {
    earnerId: string;
    status?: "PENDING" | "SCHEDULED" | "PAID" | "REVERSED";
  } = {
    earnerId: params.earnerId,
  };

  if (params.status && params.status !== "all") {
    where.status = params.status;
  }

  const [earnings, total, allEarnings] = await Promise.all([
    prisma.referralEarning.findMany({
      where,
      include: {
        referral: {
          include: {
            invitee: {
              select: {
                id: true,
                name: true,
                email: true,
                captainProfile: {
                  select: {
                    displayName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { earnedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referralEarning.count({ where }),
    prisma.referralEarning.findMany({
      where: { earnerId: params.earnerId },
      select: { status: true, commissionAmount: true },
    }),
  ]);

  // Calculate summary
  const summary: ReferralEarningsSummary = {
    totalEarned: 0,
    totalPending: 0,
    totalPaid: 0,
    totalReversed: 0,
  };

  for (const earning of allEarnings) {
    const amount = Number(earning.commissionAmount);
    summary.totalEarned += amount;

    switch (earning.status) {
      case "PENDING":
      case "SCHEDULED":
        summary.totalPending += amount;
        break;
      case "PAID":
        summary.totalPaid += amount;
        break;
      case "REVERSED":
        summary.totalReversed += amount;
        break;
    }
  }

  return {
    earnings: earnings as (ReferralEarning & {
      referral: ReferralWithDetails;
    })[],
    total,
    summary,
  };
}

// ============================================
// EXPIRY PROCESSING
// ============================================

/**
 * Process expired referrals (run as cron job)
 */
export async function processExpiredReferrals(): Promise<number> {
  const now = new Date();

  const result = await prisma.referral.updateMany({
    where: {
      status: {
        in: ["PENDING", "REGISTERED", "CHARTER_CREATED", "FIRST_BOOKING"],
      },
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });

  return result.count;
}

/**
 * Check if a user was referred
 */
export async function getUserReferral(
  userId: string
): Promise<Referral | null> {
  return prisma.referral.findUnique({
    where: { inviteeId: userId },
  });
}

/**
 * Get referral by ID
 */
export async function getReferralById(
  referralId: string
): Promise<ReferralWithDetails | null> {
  return prisma.referral.findUnique({
    where: { id: referralId },
    include: {
      invitee: {
        select: {
          id: true,
          name: true,
          email: true,
          captainProfile: {
            select: {
              displayName: true,
            },
          },
        },
      },
      earning: true,
    },
  });
}
