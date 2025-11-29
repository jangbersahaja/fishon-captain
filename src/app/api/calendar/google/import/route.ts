/**
 * Google Calendar Import API
 *
 * POST /api/calendar/google/import
 * - Imports selected Google Calendar events as blocked dates
 */

import { authOptions } from "@/lib/auth";
import {
  getCalendarSettings,
  isCalendarConnected,
  listEvents,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for import request
const ImportEventSchema = z.object({
  googleEventId: z.string(),
  charterId: z.string(),
  reason: z.string().optional(),
  blockFullDay: z.boolean().default(true),
});

const ImportRequestSchema = z.object({
  events: z.array(ImportEventSchema).min(1).max(50),
});

export async function POST(request: NextRequest) {
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

    // Get settings
    const settings = await getCalendarSettings(userId);
    if (!settings?.selectedCalendarId) {
      return NextResponse.json(
        { error: "No calendar selected" },
        { status: 400 }
      );
    }

    // Parse request
    const body = await request.json();
    const parseResult = ImportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { events: eventRequests } = parseResult.data;

    // Verify user owns the charters
    const charterIds = [...new Set(eventRequests.map((e) => e.charterId))];
    const charters = await prisma.charter.findMany({
      where: { id: { in: charterIds }, ownerId: userId },
      select: { id: true },
    });
    const ownedCharterIds = new Set(charters.map((c) => c.id));

    // Fetch Google events for the date range
    const now = new Date();
    const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year ahead
    const googleEvents = await listEvents(
      userId,
      settings.selectedCalendarId,
      now,
      futureDate,
      { maxResults: 250 }
    );

    // Create a map for quick lookup
    const googleEventMap = new Map(googleEvents.map((e) => [e.id, e]));

    // Check for already imported events
    const googleEventIds = eventRequests.map((e) => e.googleEventId);
    const existingImports = await prisma.charterUnavailability.findMany({
      where: { googleEventId: { in: googleEventIds } },
      select: { googleEventId: true, charterId: true },
    });
    const alreadyImported = new Set(
      existingImports.map((e) => `${e.charterId}:${e.googleEventId}`)
    );

    // Process imports
    const results: Array<{
      googleEventId: string;
      charterId: string;
      status: "created" | "skipped" | "error";
      message?: string;
      unavailabilityId?: string;
    }> = [];

    for (const eventRequest of eventRequests) {
      const { googleEventId, charterId, reason, blockFullDay } = eventRequest;

      // Check ownership
      if (!ownedCharterIds.has(charterId)) {
        results.push({
          googleEventId,
          charterId,
          status: "error",
          message: "You do not own this charter",
        });
        continue;
      }

      // Check if already imported
      if (alreadyImported.has(`${charterId}:${googleEventId}`)) {
        results.push({
          googleEventId,
          charterId,
          status: "skipped",
          message: "Already imported",
        });
        continue;
      }

      // Get the Google event
      const googleEvent = googleEventMap.get(googleEventId);
      if (!googleEvent) {
        results.push({
          googleEventId,
          charterId,
          status: "error",
          message: "Google event not found",
        });
        continue;
      }

      // Parse dates
      const isAllDay = !!googleEvent.start.date;
      let startDate: Date;
      let endDate: Date;
      let startTime: string | null = null;
      let endTime: string | null = null;

      if (isAllDay) {
        // All-day event
        startDate = new Date(googleEvent.start.date!);
        // Google uses exclusive end date for all-day events
        endDate = new Date(googleEvent.end.date!);
        endDate.setDate(endDate.getDate() - 1);
      } else {
        // Timed event
        startDate = new Date(googleEvent.start.dateTime!);
        endDate = new Date(googleEvent.end.dateTime!);

        if (!blockFullDay) {
          // Extract times
          startTime = startDate.toTimeString().slice(0, 5); // HH:MM
          endTime = endDate.toTimeString().slice(0, 5);
        }
      }

      try {
        // Create blocked date
        const unavailability = await prisma.charterUnavailability.create({
          data: {
            charterId,
            startDate,
            endDate,
            reason:
              reason || googleEvent.summary || "Imported from Google Calendar",
            isAllDay: blockFullDay,
            startTime: blockFullDay ? null : startTime,
            endTime: blockFullDay ? null : endTime,
            createdBy: userId,
            isFromGoogle: true,
            googleEventId,
            googleCalendarId: settings.selectedCalendarId,
            googleSyncedAt: new Date(),
            googleEventTitle: googleEvent.summary,
          },
        });

        results.push({
          googleEventId,
          charterId,
          status: "created",
          unavailabilityId: unavailability.id,
        });
      } catch (e) {
        results.push({
          googleEventId,
          charterId,
          status: "error",
          message: (e as Error).message,
        });
      }
    }

    const stats = {
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    logger.info("[google-calendar/import] Import completed", { userId, stats });

    return NextResponse.json({
      success: true,
      stats,
      results,
    });
  } catch (error) {
    logger.error("[google-calendar/import] Error", { error });
    return NextResponse.json(
      { error: "Failed to import events" },
      { status: 500 }
    );
  }
}
