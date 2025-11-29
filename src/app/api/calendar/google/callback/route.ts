/**
 * Google Calendar OAuth Callback
 *
 * Handles the OAuth callback from Google after user authorizes calendar access.
 * Exchanges authorization code for tokens and stores them.
 *
 * GET /api/calendar/google/callback?code=...&state=...
 * - Validates state parameter
 * - Exchanges code for tokens
 * - Stores tokens in GoogleCalendarSettings
 * - Redirects to calendar settings page
 */

import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { exchangeCodeForTokens, listCalendars } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// State expires after 10 minutes
const STATE_EXPIRY_MS = 10 * 60 * 1000;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Build redirect URLs - redirect to calendar page with query params for toast
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const successRedirect = `${baseUrl}/captain/calendar?gcal=connected`;
  const errorRedirect = (msg: string) =>
    `${baseUrl}/captain/calendar?gcal_error=${encodeURIComponent(msg)}`;

  // Handle OAuth errors from Google
  if (error) {
    logger.warn("[google-calendar/callback] OAuth error from Google", {
      error,
    });
    return NextResponse.redirect(
      errorRedirect(`Google denied access: ${error}`)
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return NextResponse.redirect(
      errorRedirect("Missing authorization code or state")
    );
  }

  try {
    // Decode and validate state
    let stateData: { userId: string; timestamp: number; nonce: string };
    try {
      const decoded = Buffer.from(state, "base64url").toString("utf-8");
      stateData = JSON.parse(decoded);
    } catch {
      return NextResponse.redirect(errorRedirect("Invalid state parameter"));
    }

    // Check state hasn't expired
    if (Date.now() - stateData.timestamp > STATE_EXPIRY_MS) {
      return NextResponse.redirect(
        errorRedirect("Authorization expired. Please try again.")
      );
    }

    // Verify session matches state user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== stateData.userId) {
      return NextResponse.redirect(
        errorRedirect("Session mismatch. Please try again.")
      );
    }

    const userId = session.user.id;

    // Exchange code for tokens
    const redirectUri = `${baseUrl}/api/calendar/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.access_token) {
      return NextResponse.redirect(
        errorRedirect("Failed to obtain access token")
      );
    }

    // Calculate token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null;

    // Upsert GoogleCalendarSettings
    await prisma.googleCalendarSettings.upsert({
      where: { userId },
      create: {
        userId,
        isConnected: true,
        connectedAt: new Date(),
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiresAt: expiresAt,
        googleEmail: tokens.email,
        selectedCalendarId: "primary",
      },
      update: {
        isConnected: true,
        connectedAt: new Date(),
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token || undefined, // Keep existing if not provided
        googleTokenExpiresAt: expiresAt,
        googleEmail: tokens.email,
      },
    });

    // Try to get calendar name for primary calendar
    try {
      const calendars = await listCalendars(userId);
      const primary = calendars.find((c) => c.primary);
      if (primary) {
        await prisma.googleCalendarSettings.update({
          where: { userId },
          data: { selectedCalendarName: primary.summary },
        });
      }
    } catch (e) {
      logger.warn("[google-calendar/callback] Failed to fetch calendar name", {
        error: e,
      });
      // Non-fatal, continue
    }

    logger.info("[google-calendar/callback] Successfully connected", {
      userId,
      email: tokens.email,
    });

    return NextResponse.redirect(successRedirect);
  } catch (error) {
    logger.error("[google-calendar/callback] Error processing callback", {
      error,
    });
    return NextResponse.redirect(
      errorRedirect("Failed to connect Google Calendar")
    );
  }
}
