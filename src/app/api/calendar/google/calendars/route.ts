/**
 * Google Calendar List Calendars API
 *
 * GET /api/calendar/google/calendars
 * - Returns list of calendars the user can write to
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { listCalendars, isCalendarConnected } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Check if connected
    const connected = await isCalendarConnected(userId);
    if (!connected) {
      return NextResponse.json(
        { error: "Google Calendar not connected" },
        { status: 400 }
      );
    }

    // Fetch calendars
    const googleCalendars = await listCalendars(userId);

    // Filter to only writable calendars
    const calendars = googleCalendars
      .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
      .map((c) => ({
        id: c.id,
        name: c.summary,
        primary: c.primary || false,
        backgroundColor: c.backgroundColor,
      }));

    return NextResponse.json({ calendars });
  } catch (error) {
    logger.error("[google-calendar/calendars] Error", { error });
    return NextResponse.json(
      { error: "Failed to fetch calendars" },
      { status: 500 }
    );
  }
}
