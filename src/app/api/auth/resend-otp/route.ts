/**
 * POST /api/auth/resend-otp
 * Resend OTP code for email verification or password reset
 */

import { canRequestOTP, createOTP, type OTPPurpose } from "@/lib/auth/otp";
import { sendPasswordResetOTP, sendVerificationOTP } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, purpose } = body;

    if (!email || !purpose) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required fields: email, purpose" },
          { status: 400 }
        )
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 5 requests per hour per email
    const rateLimitResult = await rateLimit({
      key: `resend-otp:${normalizedEmail}`,
      windowMs: 60 * 60 * 1000,
      max: 5,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many OTP requests. Please try again later." },
          { status: 429 }
        )
      );
    }

    // Check cooldown
    const cooldownCheck = await canRequestOTP(normalizedEmail);
    if (!cooldownCheck.canRequest) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Please wait before requesting another code.",
            cooldownSeconds: cooldownCheck.cooldownSeconds,
          },
          { status: 429 }
        )
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists
      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message: "If an account exists, a new code has been sent.",
        })
      );
    }

    // Generate new OTP
    const otpResult = await createOTP(normalizedEmail, purpose as OTPPurpose);
    if (!otpResult.success || !otpResult.code) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: otpResult.error || "Failed to generate code" },
          { status: 500 }
        )
      );
    }

    // Send appropriate email based on purpose
    if (purpose === "email_verification") {
      await sendVerificationOTP(
        user.email!,
        otpResult.code,
        user.name || "User"
      );
    } else if (purpose === "password_reset") {
      await sendPasswordResetOTP(
        user.email!,
        otpResult.code,
        user.name || "User"
      );
    }

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "A new verification code has been sent to your email.",
      })
    );
  } catch (error) {
    console.error("[resend-otp] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to resend code" }, { status: 500 })
    );
  }
}
