/**
 * Admin API Route - List Users with Security Status
 * GET /api/admin/users
 *
 * Returns list of users with security information for admin dashboard
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { withTiming } from "@/lib/requestTiming";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return withTiming("admin_users_list", async () => {
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
    const identifier = `admin_users_${session.user.id}`;
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
      const search = searchParams.get("search") || "";
      const roleFilter = searchParams.get("role") || "";
      const statusFilter = searchParams.get("status") || ""; // locked, mfa_enabled, active

      const skip = (page - 1) * limit;

      // Build where clause with proper Prisma types
      const where: Record<string, unknown> = {};

      // Search by email or name
      if (search) {
        where.OR = [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ];
      }

      // Filter by role
      if (roleFilter && ["CAPTAIN", "STAFF", "ADMIN"].includes(roleFilter)) {
        where.role = roleFilter;
      }

      // Filter by status
      if (statusFilter === "locked") {
        where.lockedUntil = { gt: new Date() };
      } else if (statusFilter === "mfa_enabled") {
        where.passwordMfaEnabled = true;
      } else if (statusFilter === "active") {
        where.OR = [
          { lockedUntil: null },
          { lockedUntil: { lte: new Date() } },
        ];
      }

      // Fetch users with security information
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            emailVerified: true,
            passwordMfaEnabled: true,
            passwordMfaMethod: true,
            passwordMfaVerifiedAt: true,
            loginAttempts: true,
            lockedUntil: true,
            forcePasswordReset: true,
            createdAt: true,
            updatedAt: true,
            // Check if OAuth-only user
            passwordHash: true,
          },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.count({ where }),
      ]);

      // Transform users for response (hide sensitive fields)
      const transformedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        passwordMfaEnabled: user.passwordMfaEnabled,
        passwordMfaMethod: user.passwordMfaMethod,
        passwordMfaVerifiedAt: user.passwordMfaVerifiedAt,
        loginAttempts: user.loginAttempts,
        lockedUntil: user.lockedUntil,
        isLocked: user.lockedUntil ? user.lockedUntil > new Date() : false,
        forcePasswordReset: user.forcePasswordReset,
        isOAuthOnly: !user.passwordHash,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      return applySecurityHeaders(
        NextResponse.json({
          users: transformedUsers,
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
      console.error("Admin users list error:", error);
      return applySecurityHeaders(
        NextResponse.json({ error: "Internal server error" }, { status: 500 })
      );
    }
  });
}
