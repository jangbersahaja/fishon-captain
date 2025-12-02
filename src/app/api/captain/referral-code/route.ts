/**
 * Captain Referral Code API
 *
 * GET  - Get captain's referral code with stats
 * POST - Generate/regenerate referral code
 */

import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { rateLimit } from "@/lib/rateLimiter";
import {
  checkReferralEligibility,
  getOrCreateReferralCode,
} from "@/lib/services/referral-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/captain/referral-code
 *
 * Get captain's referral code with statistics
 */
export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Check for admin bypass
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const userId = getEffectiveUserId({ session, query });
    if (!userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Rate limiting
    const rateLimitResult = await rateLimit({
      key: `referral-code-get:${userId}`,
      max: 10,
      windowMs: 60000,
    }); // 10 requests per minute
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
    }

    // Check eligibility first
    const eligibility = await checkReferralEligibility(userId);
    if (!eligibility.eligible) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Not eligible for referral programme",
            reason: eligibility.reason,
            eligible: false,
          },
          { status: 403 }
        )
      );
    }

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(userId);

    return applySecurityHeaders(
      NextResponse.json({
        code: referralCode.code,
        shareUrl: referralCode.shareUrl,
        stats: referralCode.stats,
        isActive: referralCode.isActive,
        createdAt: referralCode.createdAt,
        eligible: true,
      })
    );
  } catch (error) {
    console.error("[Referral Code GET] Error:", error);

    // Handle eligibility errors
    if (error instanceof Error && error.message.startsWith("NOT_ELIGIBLE:")) {
      const reason = error.message.split(":")[1];
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Not eligible for referral programme",
            reason,
            eligible: false,
          },
          { status: 403 }
        )
      );
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

/**
 * POST /api/captain/referral-code
 *
 * Generate a new referral code (only if one doesn't exist)
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Check for admin bypass
    const query = Object.fromEntries(req.nextUrl.searchParams);
    const userId = getEffectiveUserId({ session, query });
    if (!userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Rate limiting (stricter for POST)
    const rateLimitResult = await rateLimit({
      key: `referral-code-create:${userId}`,
      max: 3,
      windowMs: 60000,
    }); // 3 requests per minute
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
    }

    // Check eligibility first
    const eligibility = await checkReferralEligibility(userId);
    if (!eligibility.eligible) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Not eligible for referral programme",
            reason: eligibility.reason,
            eligible: false,
          },
          { status: 403 }
        )
      );
    }

    // Get or create referral code
    const referralCode = await getOrCreateReferralCode(userId);

    return applySecurityHeaders(
      NextResponse.json(
        {
          code: referralCode.code,
          shareUrl: referralCode.shareUrl,
          stats: referralCode.stats,
          isActive: referralCode.isActive,
          createdAt: referralCode.createdAt,
          eligible: true,
        },
        { status: 201 }
      )
    );
  } catch (error) {
    console.error("[Referral Code POST] Error:", error);

    // Handle eligibility errors
    if (error instanceof Error && error.message.startsWith("NOT_ELIGIBLE:")) {
      const reason = error.message.split(":")[1];
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Not eligible for referral programme",
            reason,
            eligible: false,
          },
          { status: 403 }
        )
      );
    }

    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
