/**
 * POST /api/auth/reset-password
 * Reset password with OTP verification
 * Validates OTP, then updates password
 */

import { validateOTP } from "@/lib/auth/otp";
import { sendPasswordChangedNotification } from "@/lib/email";
import { applySecurityHeaders } from "@/lib/headers";
import { validatePassword, validatePasswordWithHistory } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, code, password, confirmPassword } = body;

    console.log("[reset-password] Request received:", {
      email,
      hasCode: !!code,
      hasPassword: !!password,
      hasConfirmPassword: !!confirmPassword,
      passwordLength: password?.length,
    });

    if (!email || !code || !password || !confirmPassword) {
      console.error("[reset-password] Missing fields:", {
        email: !!email,
        code: !!code,
        password: !!password,
        confirmPassword: !!confirmPassword,
      });
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "Missing required fields: email, code, password, confirmPassword",
          },
          { status: 400 }
        )
      );
    }

    if (password !== confirmPassword) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Passwords do not match" }, { status: 400 })
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: 3 attempts per hour per email
    const rateLimitResult = await rateLimit({
      key: `reset-password:${normalizedEmail}`,
      windowMs: 60 * 60 * 1000,
      max: 3,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many password reset attempts. Please try again later.",
          },
          { status: 429 }
        )
      );
    }

    // SECURITY: Validate OTP before allowing password reset
    // This prevents bypassing the OTP verification step
    const otpValidation = await validateOTP(
      normalizedEmail,
      code,
      "password_reset",
      true // Consume the OTP on successful validation
    );

    if (!otpValidation.success) {
      console.error("[reset-password] OTP validation failed:", {
        email: normalizedEmail,
        error: otpValidation.error,
      });
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: otpValidation.error || "Invalid verification code",
            attemptsRemaining: otpValidation.attemptsRemaining,
            lockedUntilMinutes: otpValidation.lockedUntilMinutes,
          },
          { status: 400 }
        )
      );
    }

    console.log("[reset-password] OTP validated successfully");

    // Find user and password history
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        PasswordHistory: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { passwordHash: true },
        },
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Password does not meet requirements",
            errors: passwordValidation.errors,
          },
          { status: 400 }
        )
      );
    }

    // Check password history (prevent reuse)
    const previousHashes = user.PasswordHistory.map((h) => h.passwordHash);
    const historyCheck = await validatePasswordWithHistory(
      password,
      previousHashes
    );
    if (!historyCheck.valid) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Password validation failed",
            errors: historyCheck.errors,
          },
          { status: 400 }
        )
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("[reset-password] Password hashed successfully:", {
      userId: user.id,
      email: user.email,
      hashLength: hashedPassword.length,
      hashPrefix: hashedPassword.substring(0, 10),
    });

    // Update password and add current password to history
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        loginAttempts: 0,
        lockedUntil: null,
      },
    });

    console.log(
      "[reset-password] Password updated in database for user:",
      user.email
    );

    // Add old password to history if it exists
    if (user.passwordHash) {
      await prisma.passwordHistory.create({
        data: {
          id: `${user.id}-${Date.now()}`,
          userId: user.id,
          passwordHash: user.passwordHash,
        },
      });
    }

    // Send notification email
    await sendPasswordChangedNotification(user.email!, user.name || "User");

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message:
          "Password reset successfully. You can now log in with your new password.",
      })
    );
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
    );
  }
}
