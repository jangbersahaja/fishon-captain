/**
 * Google Calendar Settings API
 *
 * GET /api/calendar/google/settings
 * - Returns current Google Calendar settings for the user
 *
 * PATCH /api/calendar/google/settings
 * - Updates sync preferences
 */

import { authOptions } from "@/lib/auth";
import { getCalendarSettings, listCalendars } from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for settings update
const UpdateSettingsSchema = z.object({
  selectedCalendarId: z.string().optional(),
  syncBookingsToGoogle: z.boolean().optional(),
  syncBlockedToGoogle: z.boolean().optional(),
  importFromGoogle: z.boolean().optional(),
  autoImportAllDay: z.boolean().optional(),
  autoImportKeywords: z.array(z.string()).optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is a test user (allowed to use Google Calendar)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { googleCalendarTestUser: true },
    });

    const isTestUser = user?.googleCalendarTestUser ?? false;

    // If not a test user, return early with minimal data
    if (!isTestUser) {
      return NextResponse.json({
        isTestUser: false,
        settings: {
          isConnected: false,
          syncBookingsToGoogle: true,
          syncBlockedToGoogle: true,
          importFromGoogle: false,
          autoImportAllDay: true,
          autoImportKeywords: [],
        },
        calendars: [],
      });
    }

    const settings = await getCalendarSettings(session.user.id);

    // If connected, also fetch available calendars
    let calendars: Array<{ id: string; name: string; primary: boolean }> = [];
    if (settings?.isConnected) {
      try {
        const googleCalendars = await listCalendars(session.user.id);
        calendars = googleCalendars
          .filter((c) => c.accessRole === "owner" || c.accessRole === "writer")
          .map((c) => ({
            id: c.id,
            name: c.summary,
            primary: c.primary || false,
          }));
      } catch (e) {
        logger.warn("[google-calendar/settings] Failed to fetch calendars", {
          error: e,
        });
        // Non-fatal, return settings without calendars
      }
    }

    return NextResponse.json({
      isTestUser: true,
      settings: settings || {
        isConnected: false,
        syncBookingsToGoogle: true,
        syncBlockedToGoogle: true,
        importFromGoogle: false,
        autoImportAllDay: true,
        autoImportKeywords: [],
      },
      calendars,
    });
  } catch (error) {
    logger.error("[google-calendar/settings] GET error", { error });
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate input
    const parseResult = UpdateSettingsSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    // Check if settings exist
    const existing = await prisma.googleCalendarSettings.findUnique({
      where: { userId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Google Calendar not connected. Please connect first." },
        { status: 400 }
      );
    }

    // If changing calendar, fetch the new calendar name
    let selectedCalendarName = existing.selectedCalendarName;
    if (
      data.selectedCalendarId &&
      data.selectedCalendarId !== existing.selectedCalendarId
    ) {
      try {
        const calendars = await listCalendars(userId);
        const selected = calendars.find(
          (c) => c.id === data.selectedCalendarId
        );
        if (selected) {
          selectedCalendarName = selected.summary;
        }
      } catch {
        // Non-fatal
      }
    }

    // Update settings
    const updated = await prisma.googleCalendarSettings.update({
      where: { userId },
      data: {
        ...data,
        selectedCalendarName,
      },
      select: {
        isConnected: true,
        connectedAt: true,
        googleEmail: true,
        selectedCalendarId: true,
        selectedCalendarName: true,
        syncBookingsToGoogle: true,
        syncBlockedToGoogle: true,
        importFromGoogle: true,
        autoImportAllDay: true,
        autoImportKeywords: true,
        lastSyncAt: true,
      },
    });

    logger.info("[google-calendar/settings] Updated settings", {
      userId,
      changes: data,
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    logger.error("[google-calendar/settings] PATCH error", { error });
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
