/**
 * GET /api/auth/mfa/status
 * Check if MFA is enabled for authenticated user
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Get MFA status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        passwordMfaEnabled: true,
        passwordMfaMethod: true,
        passwordMfaVerifiedAt: true,
        passwordMfaBackupCodes: true,
      },
    });

    if (!user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "User not found" }, { status: 404 })
      );
    }

    const isOAuthOnly = !user.passwordHash;
    const backupCodesRemaining = user.passwordMfaBackupCodes?.length || 0;

    return applySecurityHeaders(
      NextResponse.json({
        enabled: user.passwordMfaEnabled,
        method: user.passwordMfaMethod,
        verifiedAt: user.passwordMfaVerifiedAt,
        backupCodesRemaining,
        isOAuthOnly,
        canEnableMfa: !isOAuthOnly,
      })
    );
  } catch (error) {
    console.error("[mfa/status] Error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to get MFA status" }, { status: 500 })
    );
  }
}
