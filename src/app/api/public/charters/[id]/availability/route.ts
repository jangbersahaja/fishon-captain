/**
 * Public Charter Availability API
 *
 * Provides availability information for fishon-market booking flow.
 *
 * Returns:
 * - Operational schedule (EVERYDAY, WEEKDAYS, WEEKENDS, CUSTOM)
 * - Unavailable date ranges
 * - Helper method to check specific dates
 *
 * @route /api/public/charters/[id]/availability
 */

import { prisma } from "@/lib/prisma";
import {
  checkDateAvailability,
  getAvailabilityForRange,
} from "@/lib/services/availability-service";
import { addDays, parseISO } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/public/charters/[id]/availability
 *
 * Public endpoint for charter availability information.
 *
 * Query params:
 * - startDate (optional): Start of date range to check
 * - endDate (optional): End of date range to check
 * - date (optional): Check specific date
 *
 * Response:
 * {
 *   schedule: { scheduleType, operationalDays },
 *   unavailability: [...],
 *   dateAvailability?: [...] // If date range provided
 *   dateCheck?: { available, reason } // If specific date provided
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: charterId } = await params;
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const dateParam = searchParams.get("date");

    // Fetch charter with schedule and unavailability
    const charter = await prisma.charter.findUnique({
      where: { id: charterId, isActive: true },
      include: {
        schedule: true,
        unavailability: {
          where: {
            endDate: { gte: new Date() }, // Only future/current blocks
          },
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!charter) {
      return NextResponse.json(
        { error: "Charter not found or inactive" },
        { status: 404 }
      );
    }

    // Base response
    const response: {
      schedule: typeof charter.schedule;
      unavailability: typeof charter.unavailability;
      dateAvailability?: Awaited<ReturnType<typeof getAvailabilityForRange>>;
      dateCheck?: Awaited<ReturnType<typeof checkDateAvailability>>;
    } = {
      schedule: charter.schedule,
      unavailability: charter.unavailability,
    };

    // Handle specific date check
    if (dateParam) {
      try {
        const date = parseISO(dateParam);
        const availability = await checkDateAvailability(charterId, date);
        response.dateCheck = availability;
      } catch {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
    }

    // Handle date range check
    if (startDateParam && endDateParam) {
      try {
        const startDate = parseISO(startDateParam);
        const endDate = parseISO(endDateParam);

        if (startDate >= endDate) {
          return NextResponse.json(
            { error: "End date must be after start date" },
            { status: 400 }
          );
        }

        // Limit range to 90 days
        const maxEndDate = addDays(startDate, 90);
        const effectiveEndDate = endDate > maxEndDate ? maxEndDate : endDate;

        const dateAvailability = await getAvailabilityForRange(
          charterId,
          startDate,
          effectiveEndDate
        );
        response.dateAvailability = dateAvailability;
      } catch {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO 8601 format." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching charter availability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
