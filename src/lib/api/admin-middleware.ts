/**
 * Shared middleware utilities for admin API routes
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export type AdminRole = "ADMIN" | "STAFF";

// interface AuthResult {
//   userId: string;
//   role: string;
// }

// interface AuthError {
//   response: Response;
// }

export type AuthCheckResult =
  | { success: true; userId: string; role: string }
  | { success: false; response: Response };

/**
 * Check if user is authenticated and has required role
 * @param allowedRoles - Roles that are allowed (default: ADMIN and STAFF)
 */
export async function checkAdminAuth(
  allowedRoles: AdminRole[] = ["ADMIN", "STAFF"]
): Promise<AuthCheckResult> {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = session?.user?.id;

  // Check authentication
  if (!session?.user || !userId) {
    return {
      success: false,
      response: applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      ),
    };
  }

  // Check authorization
  if (!role || !allowedRoles.includes(role as AdminRole)) {
    return {
      success: false,
      response: applySecurityHeaders(
        NextResponse.json(
          { error: "Forbidden - Admin access required" },
          { status: 403 }
        )
      ),
    };
  }

  return { success: true, userId, role };
}

/**
 * Check if user is authenticated and is an ADMIN
 */
export async function requireAdmin(): Promise<AuthCheckResult> {
  return checkAdminAuth(["ADMIN"]);
}

/**
 * Check if user is authenticated and is ADMIN or STAFF
 */
export async function requireAdminOrStaff(): Promise<AuthCheckResult> {
  return checkAdminAuth(["ADMIN", "STAFF"]);
}

interface RateLimitOptions {
  key: string;
  windowMs?: number;
  max?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  response?: Response;
}

/**
 * Apply rate limiting to admin routes
 */
export async function checkRateLimit(
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { key, windowMs = 60 * 1000, max = 10 } = options;

  const rateLimitResult = await rateLimit({
    key,
    windowMs,
    max,
  });

  if (!rateLimitResult.allowed) {
    return {
      allowed: false,
      response: applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many requests",
            resetAt: rateLimitResult.resetAt,
          },
          { status: 429 }
        )
      ),
    };
  }

  return { allowed: true };
}
