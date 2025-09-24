import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Protect onboarding; redirect unauthenticated to /captains/register with next param
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isOnboarding = pathname.startsWith("/captains/onboarding");
  const isAuthPage = pathname === "/captains/register";

  // NextAuth default cookie keys (jwt strategy)
  const sessionToken =
    req.cookies.get("next-auth.session-token") ||
    req.cookies.get("__Secure-next-auth.session-token");

  if (isOnboarding && !sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/captains/register";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (isAuthPage && sessionToken) {
    const url = req.nextUrl.clone();
    const next = req.nextUrl.searchParams.get("next") || "/captains/onboarding";
    url.pathname = next;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/captains/onboarding/:path*", "/captains/register"],
};
