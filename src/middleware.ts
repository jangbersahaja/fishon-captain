import { env } from "@/lib/env"; // early env validation
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { getToken } from "next-auth/jwt";
import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Paths that require authentication
const PROTECTED_PREFIXES = ["/captain", "/staff"];

// Paths that should skip i18n (API routes, auth, protected routes)
const SKIP_I18N_PREFIXES = [
  "/api",
  "/auth",
  "/captain",
  "/staff",
  "/_next",
  "/images",
  "/favicon",
];

// Create i18n middleware for marketing pages only
const intlMiddleware = createIntlMiddleware({
  locales: ["ms", "en"],
  defaultLocale: "ms",
  localePrefix: "as-needed", // Only add /en prefix, not /ms
});

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = crypto.randomUUID();

  // Check if this is a marketing/public route (should use i18n)
  const shouldUseI18n = !SKIP_I18N_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Apply i18n middleware for marketing pages
  if (shouldUseI18n) {
    const intlResponse = intlMiddleware(req);
    if (intlResponse) {
      intlResponse.headers.set("x-request-id", requestId);
      return applySecurityHeaders(intlResponse);
    }
  }

  const protectedMatch = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!protectedMatch) {
    const res = NextResponse.next();
    res.headers.set("x-request-id", requestId);
    return applySecurityHeaders(res);
  }

  // Attempt to read token (works with JWT strategy). If missing, redirect.
  const token = await getToken({
    req,
    secret: env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token.captain",
  });
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
  matcher: [
    // I18n routes (public/marketing pages)
    "/",
    "/(ms|en)/:path*",
    // Protected routes
    "/captain/:path*",
    "/staff/:path*",
    "/staff",
  ],
};
