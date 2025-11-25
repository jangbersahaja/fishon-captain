/**
 * Charter Unavailability Management API
 *
 * GET: List unavailable date ranges
 * POST: Create unavailability block
 * PATCH: Update unavailability block
 * DELETE: Remove unavailability block
 *
 * @route /api/charters/[id]/unavailability
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildDateRange,
  normalizeUnavailabilityPayload,
  shouldPersistTimes,
  UnavailabilityPayloadSchema,
} from "@/lib/schemas/unavailability";
import { validateUnavailability } from "@/lib/services/availability-service";
import type { CharterUnavailability } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schemas
const UnavailabilityCreateSchema = UnavailabilityPayloadSchema;

const UnavailabilityUpdateSchema = UnavailabilityPayloadSchema.safeExtend({
  unavailabilityId: z.string(),
});

const UnavailabilityDeleteSchema = z.object({
  unavailabilityId: z.string(),
});

interface UnavailabilityListResponse {
  unavailability: CharterUnavailability[];
  count: number;
}

interface UnavailabilityMutationResponse {
  unavailability: CharterUnavailability;
  message: string;
}

interface ConflictDetails {
  id: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

const formatConflictDetails = (
  conflict?: CharterUnavailability
): ConflictDetails | undefined => {
  if (!conflict) {
    return undefined;
  }

  return {
    id: conflict.id,
    startDate: conflict.startDate,
    endDate: conflict.endDate,
    isAllDay: conflict.isAllDay,
    startTime: conflict.startTime,
    endTime: conflict.endTime,
    reason: conflict.reason ?? null,
  };
};

/**
 * GET /api/charters/[id]/unavailability
 *
 * List all unavailability blocks for a charter.
 *
 * Query params:
 * - startDate (optional): Filter blocks after this date
 * - endDate (optional): Filter blocks before this date
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
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    // Build query filter
    const whereClause =
      startDate && endDate
        ? {
            charterId,
            OR: [
              {
                startDate: { lte: new Date(endDate) },
                endDate: { gte: new Date(startDate) },
              },
            ],
          }
        : { charterId };

    // Fetch unavailability blocks
    const unavailability = await prisma.charterUnavailability.findMany({
      where: whereClause,
      orderBy: { startDate: "asc" },
    });

    const response: UnavailabilityListResponse = {
      unavailability,
      count: unavailability.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching unavailability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/charters/[id]/unavailability
 *
 * Create a new unavailability block.
 *
 * Request body:
 * {
 *   startDate: string (ISO datetime),
 *   endDate: string (ISO datetime),
 *   reason?: string
 *   isAllDay?: boolean
 *   startTime?: string
 *   endTime?: string
 * }
 */
export async function POST(
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
    const body: unknown = await request.json();
    const validation = UnavailabilityCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const normalizedPayload = normalizeUnavailabilityPayload(validation.data);
    const { start, end } = buildDateRange(normalizedPayload);
    const times = shouldPersistTimes(normalizedPayload);

    // Validate no overlapping blocks
    const validationResult = await validateUnavailability(
      charterId,
      start,
      end,
      undefined,
      normalizedPayload.tripId
    );
    if (!validationResult.canCreate) {
      return NextResponse.json(
        {
          error:
            validationResult.message || "Cannot create unavailability block",
          conflict: formatConflictDetails(validationResult.conflict),
        },
        { status: 409 }
      );
    }

    // Create unavailability block
    const unavailability = await prisma.charterUnavailability.create({
      data: {
        charterId,
        startDate: start,
        endDate: end,
        reason: normalizedPayload.reason,
        isAllDay: normalizedPayload.isAllDay,
        startTime: times.startTime,
        endTime: times.endTime,
        tripId: normalizedPayload.tripId,
        createdBy: session.user.id,
      },
    });

    const response: UnavailabilityMutationResponse = {
      unavailability,
      message: "Unavailability block created successfully",
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating unavailability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/charters/[id]/unavailability
 *
 * Update an existing unavailability block.
 *
 * Request body:
 * {
 *   unavailabilityId: string,
 *   startDate: string (ISO datetime),
 *   endDate: string (ISO datetime),
 *   reason?: string
 *   isAllDay?: boolean
 *   startTime?: string
 *   endTime?: string
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

    // Parse and validate request body
    const body: unknown = await request.json();
    const validation = UnavailabilityUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const normalizedPayload = normalizeUnavailabilityPayload(validation.data);
    const { unavailabilityId } = validation.data;
    const { start, end } = buildDateRange(normalizedPayload);
    const times = shouldPersistTimes(normalizedPayload);

    // Fetch existing block to verify ownership
    const existingBlock = await prisma.charterUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: {
        charter: {
          include: {
            captain: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existingBlock) {
      return NextResponse.json(
        { error: "Unavailability block not found" },
        { status: 404 }
      );
    }

    if (existingBlock.charterId !== charterId) {
      return NextResponse.json(
        { error: "Unavailability block does not belong to this charter" },
        { status: 400 }
      );
    }

    // Authorization check
    const isOwner = existingBlock.charter.captain.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate no overlapping blocks (excluding current one)
    const validationResult = await validateUnavailability(
      charterId,
      start,
      end,
      unavailabilityId,
      normalizedPayload.tripId
    );
    if (!validationResult.canCreate) {
      return NextResponse.json(
        {
          error:
            validationResult.message || "Cannot update unavailability block",
          conflict: formatConflictDetails(validationResult.conflict),
        },
        { status: 409 }
      );
    }

    // Update unavailability block
    const unavailability = await prisma.charterUnavailability.update({
      where: { id: unavailabilityId },
      data: {
        startDate: start,
        endDate: end,
        reason: normalizedPayload.reason,
        isAllDay: normalizedPayload.isAllDay,
        startTime: times.startTime,
        endTime: times.endTime,
        tripId: normalizedPayload.tripId,
      },
    });

    const response: UnavailabilityMutationResponse = {
      unavailability,
      message: "Unavailability block updated successfully",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating unavailability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/charters/[id]/unavailability
 *
 * Remove an unavailability block.
 *
 * Request body:
 * {
 *   unavailabilityId: string
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: charterId } = await params;

    // Parse request body
    const body = await request.json();
    const validation = UnavailabilityDeleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { unavailabilityId } = validation.data;

    // Fetch unavailability block
    const unavailability = await prisma.charterUnavailability.findUnique({
      where: { id: unavailabilityId },
      include: {
        charter: {
          include: {
            captain: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!unavailability) {
      return NextResponse.json(
        { error: "Unavailability block not found" },
        { status: 404 }
      );
    }

    // Verify charterId matches
    if (unavailability.charterId !== charterId) {
      return NextResponse.json(
        { error: "Unavailability block does not belong to this charter" },
        { status: 400 }
      );
    }

    // Authorization check
    const isOwner = unavailability.charter.captain.userId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the block
    await prisma.charterUnavailability.delete({
      where: { id: unavailabilityId },
    });

    return NextResponse.json({
      message: "Unavailability block removed successfully",
    });
  } catch (error) {
    console.error("Error deleting unavailability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
