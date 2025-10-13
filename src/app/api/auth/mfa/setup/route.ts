/**
 * POST /api/auth/mfa/setup
 * Generate TOTP secret and QR code for MFA setup
 * Requires authenticated user with password
 */

import { authOptions } from "@/lib/auth";
import { setupMFA } from "@/lib/auth/mfa-provider";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication first
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limiting: 3 requests per 10 minutes per user
    const rateLimitResult = await rateLimit({
      key: `mfa-setup:${userId}`,
      windowMs: 10 * 60 * 1000, // 10 minutes
      max: 3,
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        )
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        passwordHash: true,
        passwordMfaEnabled: true,
        passwordMfaMethod: true,
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    // Check if user has password auth (not OAuth-only)
    if (!user.passwordHash) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error:
              "MFA setup is only available for password-authenticated accounts.",
            hint: "OAuth users should enable 2FA through their OAuth provider.",
          },
          { status: 400 }
        )
      );
    }

    // Check if MFA is already enabled
    if (user.passwordMfaEnabled) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "MFA is already enabled. Disable it first to set up again.",
          },
          { status: 400 }
        )
      );
    }

    // Parse request body
    const body = await request.json();
    const method = body.method || "TOTP";

    if (method !== "TOTP") {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: `MFA method ${method} is not yet supported. Currently only TOTP is available.`,
          },
          { status: 400 }
        )
      );
    }

    // Generate MFA setup data (secret, QR code, backup codes)
    const setupData = await setupMFA(userId, user.email!, method);

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: {
          qrCode: setupData.qrCodeDataUrl,
          manualEntryKey: setupData.manualEntryKey,
          backupCodes: setupData.backupCodes,
          // Don't send raw secret to client - it's encrypted and stored temporarily
        },
        message:
          "Scan the QR code with your authenticator app, then verify with a code.",
      })
    );
  } catch (error) {
    console.error("[mfa/setup] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to generate MFA setup data" },
        { status: 500 }
      )
    );
  }
}
