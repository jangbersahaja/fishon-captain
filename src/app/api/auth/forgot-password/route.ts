/**
 * POST /api/auth/forgot-password
 * Send password reset OTP to user's email
 */

import { canRequestOTP, createOTP } from "@/lib/auth/otp";
import { sendPasswordResetOTP } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Email is required" }, { status: 400 })
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 3 requests per hour per email
    const rateLimitResult = await rateLimit({
      key: `forgot-password:${normalizedEmail}`,
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many password reset requests. Please try again later.",
          },
          { status: 429 }
        )
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    // Always return success (don't reveal if user exists)
    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message:
            "If an account exists with this email, a password reset code has been sent.",
        })
      );
    }

    // Check if user has password (not OAuth-only)
    if (!user.passwordHash) {
      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message:
            "If an account exists with this email, a password reset code has been sent.",
          hint: "This account uses OAuth authentication. No password reset needed.",
        })
      );
    }

    // Check OTP request cooldown
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

    // Generate and send OTP
    const otpResult = await createOTP(normalizedEmail, "password_reset");
    if (!otpResult.success || !otpResult.code) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: otpResult.error || "Failed to generate verification code" },
          { status: 500 }
        )
      );
    }

    await sendPasswordResetOTP(
      user.email!,
      user.name || "User",
      otpResult.code
    );

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message:
          "Password reset code sent to your email. It will expire in 5 minutes.",
      })
    );
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to send password reset code" },
        { status: 500 }
      )
    );
  }
}
