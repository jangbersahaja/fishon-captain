/**
 * POST /api/auth/mfa/disable
 * Disable MFA for authenticated user
 * Requires password confirmation for security
 */

import { authOptions } from "@/lib/auth";
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

    // Rate limiting: 3 attempts per 10 minutes
    const rateLimitResult = await rateLimit({
      key: `mfa-disable:${userId}`,
      windowMs: 10 * 60 * 1000,
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

    // Parse request body
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Password is required to disable MFA" },
          { status: 400 }
        )
      );
    }

    // Get user with MFA status and password
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
          { error: "Cannot disable MFA for OAuth-only accounts" },
          { status: 400 }
        )
      );
    }

    if (!user.passwordMfaEnabled) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "MFA is not currently enabled" },
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

    // Disable MFA and clear related fields
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordMfaEnabled: false,
        passwordMfaMethod: null,
        passwordMfaSecret: null,
        passwordMfaBackupCodes: [],
        passwordMfaVerifiedAt: null,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message: "MFA has been disabled successfully",
      })
    );
  } catch (error) {
    console.error("[mfa/disable] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to disable MFA" }, { status: 500 })
    );
  }
}
