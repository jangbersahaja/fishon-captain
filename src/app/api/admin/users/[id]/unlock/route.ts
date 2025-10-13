/**
 * Admin API Route - Unlock User Account
 * POST /api/admin/users/[id]/unlock
 *
 * Unlocks a locked user account
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { withTiming } from "@/lib/requestTiming";
import { writeAuditLog } from "@/server/audit";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTiming("admin_unlock_account", async () => {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    // Check admin/staff role
    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "STAFF") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      );
    }

    // Rate limiting
    const identifier = `admin_unlock_${session.user.id}`;
    const rateLimitResult = await rateLimit({
      key: identifier,
      windowMs: 60 * 1000,
      max: 10,
    });
    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many requests",
            resetAt: rateLimitResult.resetAt,
          },
          { status: 429 }
        )
      );
    }

    try {
      const { id: userId } = await params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          lockedUntil: true,
          loginAttempts: true,
        },
      });

      if (!user) {
        return applySecurityHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 })
        );
      }

      // Check if user is actually locked
      const isLocked = user.lockedUntil && user.lockedUntil > new Date();
      if (!isLocked) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "User account is not locked" },
            { status: 400 }
          )
        );
      }

      // Unlock the account
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: null,
          loginAttempts: 0,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Write audit log
      await writeAuditLog({
        action: "UNLOCK_ACCOUNT",
        actorUserId: session.user.id,
        entityType: "captainProfile",
        entityId: userId,
        after: {
          targetEmail: updatedUser.email,
          lockedUntil: null,
          loginAttempts: 0,
        },
        changed: {
          previousLockedUntil: user.lockedUntil?.toISOString(),
          previousLoginAttempts: user.loginAttempts,
        },
      });

      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message: "Account unlocked successfully",
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
        })
      );
    } catch (error) {
      console.error("Admin unlock account error:", error);
      return applySecurityHeaders(
        NextResponse.json({ error: "Internal server error" }, { status: 500 })
      );
    }
  });
}
