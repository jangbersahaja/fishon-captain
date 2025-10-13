/**
 * POST /api/auth/mfa/regenerate-backup-codes
 * Generate new backup codes (requires password confirmation)
 * Old backup codes will be invalidated
 */

import { authOptions } from "@/lib/auth";
import { encryptArray } from "@/lib/auth/mfa-encryption";
import { generateBackupCodes } from "@/lib/auth/mfa-totp";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import bcrypt from "bcryptjs";
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

    // Rate limiting: 2 requests per hour
    const rateLimitResult = await rateLimit({
      key: `mfa-regenerate-backup:${userId}`,
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 2,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        )
      );
    }

    // Parse request body
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Password is required to regenerate backup codes" },
          { status: 400 }
        )
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        passwordMfaEnabled: true,
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    if (!user.passwordHash) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Cannot regenerate backup codes for OAuth-only accounts" },
          { status: 400 }
        )
      );
    }

    if (!user.passwordMfaEnabled) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "MFA is not enabled. Enable MFA first." },
          { status: 400 }
        )
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid password" }, { status: 401 })
      );
    }

    // Generate new backup codes
    const newBackupCodes = generateBackupCodes(10);
    const encryptedBackupCodes = JSON.parse(encryptArray(newBackupCodes));

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordMfaBackupCodes: encryptedBackupCodes,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        backupCodes: newBackupCodes,
        message:
          "New backup codes generated. Save them securely - they cannot be recovered.",
      })
    );
  } catch (error) {
    console.error("[mfa/regenerate-backup-codes] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to regenerate backup codes" },
        { status: 500 }
      )
    );
  }
}
