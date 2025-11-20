/**
 * Shared authentication and authorization utilities for API routes
 */

import { applySecurityHeaders } from "@/lib/headers";
import { NextResponse } from "next/server";

/**
 * Extract Bearer token from Authorization header
 */
export function getAuthToken(req: Request): string | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

/**
 * Verify API key authorization
 * Returns an error response if auth fails, null if successful
 */
export function verifyApiKey(req: Request): Response | null {
  const token = getAuthToken(req);
  const expected = process.env.FISHON_CAPTAIN_API_KEY;
  if (!token || !expected || token !== expected) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }
  return null;
}
