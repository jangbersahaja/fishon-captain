/**
 * Referral Validation API
 *
 * GET - Validate a referral code (public endpoint)
 */

import { applySecurityHeaders } from "@/lib/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { validateReferralCode } from "@/lib/services/referral-service";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/referrals/validate?code=CODE&email=EMAIL
 *
 * Validate a referral code before registration.
 * Optionally check if the email would cause a self-referral.
 *
 * Query params:
 * - code: string (required) - The referral code to validate
 * - email?: string - Email to check for self-referral
 */
export async function GET(req: NextRequest) {
  try {
    // Get IP from headers for rate limiting
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const sourceIp = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Rate limiting by IP
    const rateLimitResult = await rateLimit({
      key: `referral-validate:${sourceIp}`,
      max: 20,
      windowMs: 60000,
    }); // 20 requests per minute per IP
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 })
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const email = searchParams.get("email");

    // Validate code param
    if (!code || typeof code !== "string" || code.length > 20) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid referral code" }, { status: 400 })
      );
    }

    // Validate the code
    const result = await validateReferralCode(
      code.toUpperCase(),
      email || undefined
    );

    if (!result.valid) {
      return applySecurityHeaders(
        NextResponse.json({
          valid: false,
          error: result.error,
          message: getErrorMessage(result.error),
        })
      );
    }

    return applySecurityHeaders(
      NextResponse.json({
        valid: true,
        invitor: {
          name: result.invitor?.name,
          charterCount: result.invitor?.charterCount,
        },
      })
    );
  } catch (error) {
    console.error("[Referral Validate GET] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(
  error?:
    | "INVALID"
    | "EXPIRED"
    | "INACTIVE"
    | "SELF_REFERRAL"
    | "ALREADY_REGISTERED"
    | "DUPLICATE_CLICK"
    | "RATE_LIMITED"
): string {
  switch (error) {
    case "INVALID":
      return "This referral code does not exist.";
    case "EXPIRED":
      return "This referral code has expired.";
    case "INACTIVE":
      return "This referral code is no longer active.";
    case "SELF_REFERRAL":
      return "You cannot use your own referral code.";
    case "ALREADY_REGISTERED":
      return "This email is already registered.";
    case "DUPLICATE_CLICK":
      return "Please wait before clicking again.";
    case "RATE_LIMITED":
      return "Too many requests. Please try again later.";
    default:
      return "Invalid referral code.";
  }
}
