/**
 * POST /api/auth/mfa/verify-login
 * Verify MFA code during login and create pending session
 * Returns session token for completing authentication
 */

import { recordFailedAttempt, recordSuccessfulLogin } from "@/lib/auth/lockout";
import { verifyMFA } from "@/lib/auth/mfa-provider";
import { createMFAPendingSession } from "@/lib/auth/mfa-session";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, code } = body;

    if (!userId || !code) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required fields: userId, code" },
          { status: 400 }
        )
      );
    }

    // Rate limiting: 5 attempts per 15 minutes per user
    const rateLimitResult = await rateLimit({
      key: `mfa-verify-login:${userId}`,
      windowMs: 15 * 60 * 1000,
      max: 5,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many verification attempts. Account may be locked." },
          { status: 429 }
        )
      );
    }

    // Check if user exists and has MFA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordMfaEnabled: true,
        passwordMfaMethod: true,
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    if (!user.passwordMfaEnabled) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "MFA is not enabled for this user" },
          { status: 400 }
        )
      );
    }

    // Verify the MFA code (TOTP or backup code)
    const verificationResult = await verifyMFA(userId, code);

    if (!verificationResult.valid) {
      // Record failed attempt for lockout tracking
      await recordFailedAttempt(userId);

      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Invalid verification code. Please try again.",
            hint:
              code.length === 6
                ? "If you lost your authenticator, try using a backup code."
                : "Backup codes are 8 characters long (e.g., XXXX-XXXX).",
          },
          { status: 400 }
        )
      );
    }

    // Record successful login
    await recordSuccessfulLogin(userId);

    // Create temporary session token (10 min expiry)
    const sessionToken = await createMFAPendingSession(userId);

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        sessionToken,
        method: verificationResult.method,
        message:
          verificationResult.method === "backup"
            ? "Backup code accepted. Proceed to complete login."
            : "MFA verified successfully. Proceed to complete login.",
      })
    );
  } catch (error) {
    console.error("[mfa/verify-login] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to verify MFA code" }, { status: 500 })
    );
  }
}
