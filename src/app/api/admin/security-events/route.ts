/**
 * Admin API Route - Security Events Audit Log
 * GET /api/admin/security-events
 *
 * Returns audit log of security events for admin dashboard
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { withTiming } from "@/lib/requestTiming";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return withTiming("admin_security_events", async () => {
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
    const identifier = `admin_security_events_${session.user.id}`;
    const rateLimitResult = await rateLimit({
      key: identifier,
      windowMs: 60 * 1000,
      max: 20,
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
      // Parse query parameters
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const action = searchParams.get("action") || "";
      const userId = searchParams.get("userId") || "";

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Record<string, unknown> = {};

      // Filter by action
      if (action) {
        where.action = action;
      }

      // Filter by user (either actor or target entity)
      if (userId) {
        where.OR = [{ actorUserId: userId }, { entityId: userId }];
      }

      // Security-related actions only
      const securityActions = [
        "UNLOCK_ACCOUNT",
        "FORCE_PASSWORD_RESET",
        "MFA_ENABLED",
        "MFA_DISABLED",
        "PASSWORD_CHANGED",
        "PASSWORD_RESET",
        "FAILED_LOGIN",
        "ACCOUNT_LOCKED",
      ];

      where.action = action ? action : { in: securityActions };

      // Fetch audit logs
      const [logs, totalCount] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          select: {
            id: true,
            action: true,
            actorUserId: true,
            entityType: true,
            entityId: true,
            before: true,
            after: true,
            changed: true,
            correlationId: true,
            ip: true,
            userAgent: true,
            createdAt: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.count({ where }),
      ]);

      // Fetch actor user details for each log
      const actorUserIds = [...new Set(logs.map((log) => log.actorUserId))];
      const actorUsers = await prisma.user.findMany({
        where: { id: { in: actorUserIds } },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      const actorUserMap = new Map(actorUsers.map((user) => [user.id, user]));

      // Transform logs for response
      const transformedLogs = logs.map((log) => ({
        id: log.id,
        action: log.action,
        actor: actorUserMap.get(log.actorUserId) || null,
        entityType: log.entityType,
        entityId: log.entityId,
        before: log.before,
        after: log.after,
        changed: log.changed,
        correlationId: log.correlationId,
        ip: log.ip,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      }));

      return applySecurityHeaders(
        NextResponse.json({
          logs: transformedLogs,
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasNext: skip + limit < totalCount,
            hasPrev: page > 1,
          },
        })
      );
    } catch (error) {
      console.error("Admin security events error:", error);
      return applySecurityHeaders(
        NextResponse.json({ error: "Internal server error" }, { status: 500 })
      );
    }
  });
}
