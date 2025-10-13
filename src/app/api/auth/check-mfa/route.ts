/**
 * POST /api/auth/check-mfa
 * Check if a user requires MFA verification before credentials login
 * Used during login flow to determine next step
 */

import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        passwordHash: true,
        passwordMfaEnabled: true,
        passwordMfaMethod: true,
      },
    });

    if (!user) {
      // Don't reveal if user exists (security)
      return applySecurityHeaders(
        NextResponse.json({
          requiresMfa: false,
          message: "Proceed with login",
        })
      );
    }

    // OAuth-only users don't need MFA check
    if (!user.passwordHash) {
      return applySecurityHeaders(
        NextResponse.json({
          requiresMfa: false,
          message: "OAuth authentication required",
        })
      );
    }

    // Check if MFA is enabled
    if (user.passwordMfaEnabled) {
      return applySecurityHeaders(
        NextResponse.json({
          requiresMfa: true,
          userId: user.id,
          mfaMethod: user.passwordMfaMethod,
          message: "MFA verification required after password",
        })
      );
    }

    return applySecurityHeaders(
      NextResponse.json({
        requiresMfa: false,
        message: "Proceed with password login",
      })
    );
  } catch (error) {
    console.error("[check-mfa] Error:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to check MFA status" },
        { status: 500 }
      )
    );
  }
}
