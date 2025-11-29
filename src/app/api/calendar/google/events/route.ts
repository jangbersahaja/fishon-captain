/**
 * Google Calendar Events API
 *
 * GET /api/calendar/google/events
 * - Fetches events from Google Calendar for import
 *
 * POST /api/calendar/google/events/sync
 * - Syncs a specific blocked date or triggers full sync
 */

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import {
  listEvents,
  isCalendarConnected,
  getCalendarSettings,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { z } from "zod";

// Validation for query params
const GetEventsSchema = z.object({
  timeMin: z.string().datetime().optional(),
  timeMax: z.string().datetime().optional(),
  maxResults: z.coerce.number().min(1).max(250).default(50),
});

export async function GET(request: NextRequest) {
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

    // Get settings for selected calendar
    const settings = await getCalendarSettings(userId);
    if (!settings?.selectedCalendarId) {
      return NextResponse.json(
        { error: "No calendar selected" },
        { status: 400 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const parseResult = GetEventsSchema.safeParse({
      timeMin: searchParams.get("timeMin"),
      timeMax: searchParams.get("timeMax"),
      maxResults: searchParams.get("maxResults"),
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { maxResults } = parseResult.data;

    // Default to next 30 days if not specified
    const timeMin = parseResult.data.timeMin
      ? new Date(parseResult.data.timeMin)
      : new Date();
    const timeMax = parseResult.data.timeMax
      ? new Date(parseResult.data.timeMax)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Fetch events
    const googleEvents = await listEvents(
      userId,
      settings.selectedCalendarId,
      timeMin,
      timeMax,
      { maxResults }
    );

    // Transform events for frontend
    const events = googleEvents.map((event) => {
      const isAllDay = !!event.start.date;
      
      return {
        id: event.id,
        title: event.summary,
        description: event.description,
        isAllDay,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        status: event.status,
      };
    });

    return NextResponse.json({
      events,
      calendarId: settings.selectedCalendarId,
      calendarName: settings.selectedCalendarName,
      timeRange: {
        min: timeMin.toISOString(),
        max: timeMax.toISOString(),
      },
    });
  } catch (error) {
    logger.error("[google-calendar/events] GET error", { error });
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
