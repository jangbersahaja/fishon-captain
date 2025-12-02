/**
 * Referral Tracking API
 *
 * POST - Track a referral click (public endpoint)
 */

import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import {
  checkDuplicateClick,
  hashIpAddress,
  trackReferralClick,
  validateReferralCode,
} from "@/lib/services/referral-service";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/referrals/track
 *
 * Track a referral click when someone clicks a referral link.
 * Returns a referral ID to store in cookie for later attribution.
 *
 * Body:
 * - code: string (required) - The referral code
 * - utmSource?: string - UTM source
 * - utmMedium?: string - UTM medium
 * - utmCampaign?: string - UTM campaign
 */
export async function POST(req: NextRequest) {
  try {
    // Get IP from headers
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const sourceIp = forwardedFor?.split(",")[0] || realIp || "unknown";
    const sourceUserAgent = headersList.get("user-agent") || undefined;

    // Rate limiting by IP (stricter for public endpoint)
    const rateLimitResult = await rateLimit({
      key: `referral-track:${sourceIp}`,
      max: 10,
      windowMs: 60000,
    }); // 10 requests per minute per IP
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
    }

    // Parse body
    let body: {
      code?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    };
    try {
      body = await req.json();
    } catch {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      );
    }

    const { code, utmSource, utmMedium, utmCampaign } = body;

    // Validate code
    if (!code || typeof code !== "string" || code.length > 20) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid referral code" }, { status: 400 })
      );
    }

    // Validate the code exists and is active
    const validation = await validateReferralCode(code.toUpperCase());
    if (!validation.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Invalid referral code",
            reason: validation.error,
          },
          { status: 400 }
        )
      );
    }

    // Pre-check for fraud before tracking (to give better error message)
    if (sourceIp !== "unknown") {
      const hashedIp = hashIpAddress(sourceIp);
      const referralCode = await prisma.referralCode.findUnique({
        where: { code: code.toUpperCase() },
        select: { id: true },
      });

      if (referralCode) {
        const fraudCheck = await checkDuplicateClick(referralCode.id, hashedIp);
        if (!fraudCheck.allowed) {
          return applySecurityHeaders(
            NextResponse.json(
              {
                error: "Please wait before clicking again",
                reason: fraudCheck.reason,
              },
              { status: 429 }
            )
          );
        }
      }
    }

    // Track the click
    const result = await trackReferralClick({
      code: code.toUpperCase(),
      sourceIp,
      sourceUserAgent,
      utmSource,
      utmMedium,
      utmCampaign,
    });

    if (!result) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Failed to track referral" },
          { status: 500 }
        )
      );
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        referralId: result.referralId,
        invitorName: result.invitorName,
        expiresAt: result.expiresAt.toISOString(),
      })
    );
  } catch (error) {
    console.error("[Referral Track POST] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
