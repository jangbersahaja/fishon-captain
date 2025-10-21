/**
 * Admin API Route - Verify Admin Bypass Password
 * POST /api/admin/verify-password
 *
 * Validates a shared admin/staff bypass password to confirm sensitive actions
 * like impersonation or destructive operations. Returns 200 on success.
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { rateLimit } from "@/lib/rateLimiter";
import { withTiming } from "@/lib/requestTiming";
import { verifyAdminBypassPassword } from "@/lib/adminBypass";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return withTiming("admin_verify_password", async () => {
    // Require authenticated user (STAFF or ADMIN)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const role = session.user.role;
    if (role !== "ADMIN" && role !== "STAFF") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Forbidden - Admin or Staff access required" },
          { status: 403 }
        )
      );
    }

    // Basic rate limiting per-user to prevent brute force
    const limiter = await rateLimit({
      key: `admin_verify_pw_${session.user.id}`,
      windowMs: 60 * 1000,
      max: 10,
    });
    if (!limiter.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Too many attempts", resetAt: limiter.resetAt },
          { status: 429 }
        )
      );
    }

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
      );
    }

    const password = (body as { password?: string })?.password?.trim();
    if (!password) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Password is required" }, { status: 400 })
      );
    }

    const ok = await verifyAdminBypassPassword(password);
    if (!ok) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Invalid password" }, { status: 401 })
      );
    }

    return applySecurityHeaders(NextResponse.json({ ok: true }));
  });
}
