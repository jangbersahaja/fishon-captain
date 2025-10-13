/**
 * POST /api/auth/verify-otp
 * Verify OTP code for email verification or password reset
 */

import { validateOTP, type OTPPurpose } from "@/lib/auth/otp";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, code, purpose } = body;

    if (!email || !code || !purpose) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required fields: email, code, purpose" },
          { status: 400 }
        )
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 10 attempts per 15 minutes per email
    const rateLimitResult = await rateLimit({
      key: `verify-otp:${normalizedEmail}`,
      windowMs: 15 * 60 * 1000,
      max: 10,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many verification attempts. Please try again later." },
          { status: 429 }
        )
      );
    }

    // Validate OTP - don't consume it for password reset (need it for actual reset)
    const shouldConsume = purpose !== "password_reset";
    const result = await validateOTP(
      normalizedEmail,
      code,
      purpose as OTPPurpose,
      shouldConsume
    );

    if (!result.success) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: result.error,
            attemptsRemaining: result.attemptsRemaining,
            lockedUntilMinutes: result.lockedUntilMinutes,
          },
          { status: 400 }
        )
      );
    }

    // Mark email as verified for both email_verification and password_reset
    // If they can verify OTP sent to their email, the email is verified
    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { emailVerified: new Date() },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "Verification successful",
      })
    );
  } catch (error) {
    console.error("[verify-otp] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to verify code" }, { status: 500 })
    );
  }
}
