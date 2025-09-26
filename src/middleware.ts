import { env } from "@/lib/env"; // early env validation
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Paths that require authentication
const PROTECTED_PREFIXES = ["/captain", "/staff"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = crypto.randomUUID();
  const protectedMatch = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!protectedMatch) {
    const res = NextResponse.next();
    res.headers.set("x-request-id", requestId);
    return applySecurityHeaders(res);
  }

  // Attempt to read token (works with JWT strategy). If missing, redirect.
  const token = await getToken({ req, secret: env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/auth", req.url);
    loginUrl.searchParams.set("mode", "signin");
    loginUrl.searchParams.set("next", pathname + req.nextUrl.search);
    logger.info("auth_redirect", { requestId, path: pathname });
    const redir = NextResponse.redirect(loginUrl);
    redir.headers.set("x-request-id", requestId);
    return redir;
  }
  // Staff RBAC: if path under /staff, ensure role is STAFF or ADMIN
  if (pathname === "/staff" || pathname.startsWith("/staff/")) {
    const role = (token as unknown as { role?: string }).role;
    if (role !== "STAFF" && role !== "ADMIN") {
      const redir = NextResponse.redirect(new URL("/captain", req.url));
      redir.headers.set("x-request-id", requestId);
      return redir;
    }
  }
  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return applySecurityHeaders(res);
}

export const config = {
  matcher: ["/captain/:path*", "/staff/:path*", "/staff"],
};
