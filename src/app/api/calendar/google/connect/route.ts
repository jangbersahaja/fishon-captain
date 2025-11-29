/**
 * Google Calendar Connect API
 *
 * Initiates OAuth flow for Google Calendar integration.
 * This is an incremental authorization - users already have a Google account
 * linked via NextAuth, but need to grant additional calendar permissions.
 *
 * GET /api/calendar/google/connect
 * - Returns OAuth URL for user to authorize calendar access
 * - State parameter includes user ID for callback verification
 */

import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { generateOAuthUrl } from "@/lib/google-calendar";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Create state parameter with user ID and timestamp for CSRF protection
    const stateData = {
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString("base64url");

    // Build redirect URI
    const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/calendar/google/callback`;

    // Generate OAuth URL
    const authUrl = generateOAuthUrl(state, redirectUri);

    return NextResponse.json({
      authUrl,
      message: "Redirect user to authUrl to authorize Google Calendar access",
    });
  } catch (error) {
    console.error("[google-calendar/connect] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
