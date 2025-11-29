/**
 * Google Calendar Sync API
 *
 * POST /api/calendar/google/sync
 * - Syncs blocked dates to Google Calendar
 * - Can sync a single item or do a full sync
 */

import { authOptions } from "@/lib/auth";
import {
  createEvent,
  deleteEvent,
  formatAsGoogleEvent,
  getCalendarSettings,
  isCalendarConnected,
  updateEvent,
} from "@/lib/google-calendar";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema
const SyncRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("push"),
    unavailabilityId: z.string(),
  }),
  z.object({
    action: z.literal("delete"),
    unavailabilityId: z.string(),
  }),
  z.object({
    action: z.literal("full"),
    charterId: z.string().optional(), // Sync all for a specific charter, or all charters
  }),
]);

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
    if (!settings?.selectedCalendarId || !settings.syncBlockedToGoogle) {
      return NextResponse.json(
        { error: "Google Calendar sync not enabled" },
        { status: 400 }
      );
    }

    const calendarId = settings.selectedCalendarId;

    // Parse request
    const body = await request.json();
    const parseResult = SyncRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    switch (data.action) {
      case "push": {
        // Push a single blocked date to Google Calendar
        const unavailability = await prisma.charterUnavailability.findUnique({
          where: { id: data.unavailabilityId },
          include: { charter: { select: { name: true, ownerId: true } } },
        });

        if (!unavailability) {
          return NextResponse.json(
            { error: "Blocked date not found" },
            { status: 404 }
          );
        }

        // Verify ownership
        if (unavailability.charter.ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Skip if imported from Google (avoid circular sync)
        if (unavailability.isFromGoogle) {
          return NextResponse.json({
            success: true,
            message: "Skipped: Event was imported from Google Calendar",
          });
        }

        // Format as Google event
        const eventTitle = `🚫 ${unavailability.charter.name} - ${unavailability.reason || "Blocked"}`;
        const event = formatAsGoogleEvent({
          title: eventTitle,
          description: `Blocked date for ${unavailability.charter.name}\nReason: ${unavailability.reason || "Not specified"}\n\n(Synced from Fishon Captain)`,
          startDate: unavailability.startDate,
          endDate: unavailability.endDate,
          isAllDay: unavailability.isAllDay,
          startTime: unavailability.startTime || undefined,
          endTime: unavailability.endTime || undefined,
        });

        let googleEventId: string;

        if (unavailability.googleEventId) {
          // Update existing event
          const updated = await updateEvent(
            userId,
            calendarId,
            unavailability.googleEventId,
            event
          );
          googleEventId = updated.id!;
          logger.info("[google-calendar/sync] Updated event", {
            googleEventId,
          });
        } else {
          // Create new event
          const created = await createEvent(userId, calendarId, event);
          googleEventId = created.id!;
          logger.info("[google-calendar/sync] Created event", {
            googleEventId,
          });
        }

        // Update unavailability with Google event ID
        await prisma.charterUnavailability.update({
          where: { id: data.unavailabilityId },
          data: {
            googleEventId,
            googleCalendarId: calendarId,
            googleSyncedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          googleEventId,
          action: unavailability.googleEventId ? "updated" : "created",
        });
      }

      case "delete": {
        // Delete event from Google Calendar
        const unavailability = await prisma.charterUnavailability.findUnique({
          where: { id: data.unavailabilityId },
          include: { charter: { select: { ownerId: true } } },
        });

        if (!unavailability) {
          return NextResponse.json(
            { error: "Blocked date not found" },
            { status: 404 }
          );
        }

        // Verify ownership
        if (unavailability.charter.ownerId !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (unavailability.googleEventId && unavailability.googleCalendarId) {
          try {
            await deleteEvent(
              userId,
              unavailability.googleCalendarId,
              unavailability.googleEventId
            );
            logger.info("[google-calendar/sync] Deleted event", {
              googleEventId: unavailability.googleEventId,
            });
          } catch (e) {
            // Event might already be deleted, continue
            logger.warn("[google-calendar/sync] Failed to delete event", {
              error: e,
            });
          }
        }

        return NextResponse.json({ success: true, action: "deleted" });
      }

      case "full": {
        // Full sync: Push all blocked dates to Google Calendar
        const where: { charter: { ownerId: string }; charterId?: string } = {
          charter: { ownerId: userId },
        };
        if (data.charterId) {
          where.charterId = data.charterId;
        }

        const blockedDates = await prisma.charterUnavailability.findMany({
          where,
          include: { charter: { select: { name: true } } },
        });

        let created = 0;
        let updated = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const unavailability of blockedDates) {
          // Skip imported events
          if (unavailability.isFromGoogle) {
            skipped++;
            continue;
          }

          try {
            const eventTitle = `🚫 ${unavailability.charter.name} - ${unavailability.reason || "Blocked"}`;
            const event = formatAsGoogleEvent({
              title: eventTitle,
              description: `Blocked date for ${unavailability.charter.name}\nReason: ${unavailability.reason || "Not specified"}\n\n(Synced from Fishon Captain)`,
              startDate: unavailability.startDate,
              endDate: unavailability.endDate,
              isAllDay: unavailability.isAllDay,
              startTime: unavailability.startTime || undefined,
              endTime: unavailability.endTime || undefined,
            });

            let googleEventId: string;

            if (unavailability.googleEventId) {
              const updatedEvent = await updateEvent(
                userId,
                calendarId,
                unavailability.googleEventId,
                event
              );
              googleEventId = updatedEvent.id!;
              updated++;
            } else {
              const createdEvent = await createEvent(userId, calendarId, event);
              googleEventId = createdEvent.id!;
              created++;
            }

            await prisma.charterUnavailability.update({
              where: { id: unavailability.id },
              data: {
                googleEventId,
                googleCalendarId: calendarId,
                googleSyncedAt: new Date(),
              },
            });
          } catch (e) {
            errors.push(
              `Failed to sync ${unavailability.id}: ${(e as Error).message}`
            );
          }
        }

        // Update last sync timestamp
        await prisma.googleCalendarSettings.update({
          where: { userId },
          data: { lastSyncAt: new Date() },
        });

        logger.info("[google-calendar/sync] Full sync completed", {
          userId,
          created,
          updated,
          skipped,
          errors: errors.length,
        });

        return NextResponse.json({
          success: true,
          stats: { created, updated, skipped, errors: errors.length },
          errors: errors.length > 0 ? errors : undefined,
        });
      }
    }
  } catch (error) {
    logger.error("[google-calendar/sync] Error", { error });
    return NextResponse.json(
      { error: "Failed to sync with Google Calendar" },
      { status: 500 }
    );
  }
}
