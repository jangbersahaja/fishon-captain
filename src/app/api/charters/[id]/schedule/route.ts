/**
 * Charter Schedule Management API
 *
 * GET: Retrieve charter operational schedule
 * PATCH: Update charter operational schedule
 *
 * @route /api/charters/[id]/schedule
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAffectedDatesByScheduleChange } from "@/lib/services/availability-service";
import { ScheduleType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schema
const ScheduleUpdateSchema = z.object({
  scheduleType: z.enum(["EVERYDAY", "WEEKDAYS", "WEEKENDS", "CUSTOM"]),
  operationalDays: z
    .array(z.number().int().min(0).max(6))
    .optional()
    .default([]),
});

/**
 * GET /api/charters/[id]/schedule
 *
 * Retrieve charter's operational schedule.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: charterId } = await params;

    // Fetch charter with schedule
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      include: {
        schedule: true,
        captain: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    // Authorization check: only charter owner or admin
    const isOwner = charter.captain.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      schedule: charter.schedule,
    });
  } catch (error) {
    console.error("Error fetching charter schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/charters/[id]/schedule
 *
 * Update charter's operational schedule.
 *
 * Request body:
 * {
 *   scheduleType: 'EVERYDAY' | 'WEEKDAYS' | 'WEEKENDS' | 'CUSTOM',
 *   operationalDays?: number[] // Required for CUSTOM type
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: charterId } = await params;

    // Fetch charter
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      include: {
        captain: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    // Authorization check
    const isOwner = charter.captain.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ScheduleUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { scheduleType, operationalDays } = validation.data;

    // Validate CUSTOM schedule has operational days
    if (scheduleType === "CUSTOM" && operationalDays.length === 0) {
      return NextResponse.json(
        { error: "CUSTOM schedule requires at least one operational day" },
        { status: 400 }
      );
    }

    // Calculate affected dates (for client notification)
    const affectedDates = getAffectedDatesByScheduleChange(
      scheduleType as ScheduleType,
      operationalDays
    );

    // Update schedule
    const updatedSchedule = await prisma.charterSchedule.upsert({
      where: { charterId },
      create: {
        charterId,
        scheduleType: scheduleType as ScheduleType,
        operationalDays,
      },
      update: {
        scheduleType: scheduleType as ScheduleType,
        operationalDays,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      schedule: updatedSchedule,
      affectedDates: affectedDates.map((date) => date.toISOString()),
      message: "Schedule updated successfully",
    });
  } catch (error) {
    console.error("Error updating charter schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
