/**
 * Admin API Route - Force Password Reset
 * POST /api/admin/users/[id]/force-reset
 *
 * Forces a user to reset their password on next login
 */

import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { withTiming } from "@/lib/requestTiming";
import { writeAuditLog } from "@/server/audit";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/api/admin-middleware";
import { checkRateLimit } from "@/lib/api/admin-middleware";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withTiming("admin_force_reset", async () => {
    // Check authentication and authorization
    const authResult = await requireAdminOrStaff();
    if (!authResult.success) {
      return authResult.response;
    }

    // Rate limiting
    const rateLimitResult = await checkRateLimit({
      key: `admin_force_reset_${authResult.userId}`,
      windowMs: 60 * 1000,
      max: 5,
    });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    try {
      const { id: userId } = await params;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          forcePasswordReset: true,
        },
      });

      if (!user) {
        return applySecurityHeaders(
          NextResponse.json({ error: "User not found" }, { status: 404 })
        );
      }

      // Check if user is OAuth-only (no password to reset)
      if (!user.passwordHash) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Cannot force password reset for OAuth-only users" },
            { status: 400 }
          )
        );
      }

      // Check if already forced
      if (user.forcePasswordReset) {
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Password reset already forced for this user" },
            { status: 400 }
          )
        );
      }

      // Force password reset
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          forcePasswordReset: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Write audit log
      await writeAuditLog({
        action: "FORCE_PASSWORD_RESET",
        actorUserId: authResult.userId,
        entityType: "captainProfile",
        entityId: userId,
        after: {
          targetEmail: updatedUser.email,
          forcePasswordReset: true,
        },
        changed: {
          forcePasswordReset: true,
        },
      });

      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          message: "Password reset forced successfully",
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
          },
        })
      );
    } catch (error) {
      console.error("Admin force password reset error:", error);
      return applySecurityHeaders(
        NextResponse.json({ error: "Internal server error" }, { status: 500 })
      );
    }
  });
}
