/**
 * Google Calendar Disconnect API
 *
 * POST /api/calendar/google/disconnect
 * - Revokes Google Calendar access
 * - Clears stored tokens
 * - Does NOT delete synced events from Google Calendar
 */

import { authOptions } from "@/lib/auth";
import { revokeAccess } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get current settings to retrieve access token for revocation
    const settings = await prisma.googleCalendarSettings.findUnique({
      where: { userId },
      select: {
        googleAccessToken: true,
        isConnected: true,
      },
    });

    if (!settings?.isConnected) {
      return NextResponse.json(
        { error: "Google Calendar is not connected" },
        { status: 400 }
      );
    }

    // Revoke access with Google (best effort)
    if (settings.googleAccessToken) {
      await revokeAccess(settings.googleAccessToken);
    }

    // Clear tokens and mark as disconnected
    await prisma.googleCalendarSettings.update({
      where: { userId },
      data: {
        isConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiresAt: null,
        googleEmail: null,
        // Keep preferences for potential reconnection
        // selectedCalendarId: null,
        // selectedCalendarName: null,
      },
    });

    logger.info("[google-calendar/disconnect] Successfully disconnected", {
      userId,
    });

    return NextResponse.json({
      success: true,
      message: "Google Calendar disconnected successfully",
    });
  } catch (error) {
    logger.error("[google-calendar/disconnect] Error", { error });
    return NextResponse.json(
      { error: "Failed to disconnect Google Calendar" },
      { status: 500 }
    );
  }
}
