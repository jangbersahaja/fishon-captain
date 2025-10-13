/**
 * POST /api/auth/mfa/verify-setup
 * Verify TOTP code and complete MFA setup
 * Saves encrypted secret and backup codes to database
 */

import { authOptions } from "@/lib/auth";
import { encrypt, encryptArray } from "@/lib/auth/mfa-encryption";
import { verifyTOTPCode } from "@/lib/auth/mfa-totp";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limiting: 5 attempts per 10 minutes
    const rateLimitResult = await rateLimit({
      key: `mfa-verify-setup:${userId}`,
      windowMs: 10 * 60 * 1000,
      max: 5,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many verification attempts. Please try again later." },
          { status: 429 }
        )
      );
    }

    // Parse request body
    const body = await request.json();
    const { code, secret, backupCodes } = body;

    if (!code || !secret || !backupCodes) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Missing required fields: code, secret, backupCodes" },
          { status: 400 }
        )
      );
    }

    // Verify the TOTP code
    const isValid = verifyTOTPCode(code, secret);
    if (!isValid) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid verification code. Please try again." },
          { status: 400 }
        )
      );
    }

    // Encrypt secret and backup codes
    const encryptedSecret = encrypt(secret);
    const encryptedBackupCodes = JSON.parse(encryptArray(backupCodes));

    // Save to database
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordMfaEnabled: true,
        passwordMfaMethod: "TOTP",
        passwordMfaSecret: encryptedSecret,
        passwordMfaBackupCodes: encryptedBackupCodes,
        passwordMfaVerifiedAt: new Date(),
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "MFA setup completed successfully",
      })
    );
  } catch (error) {
    console.error("[mfa/verify-setup] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to verify MFA setup" },
        { status: 500 }
      )
    );
  }
}
