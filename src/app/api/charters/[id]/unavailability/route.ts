/**
 * Charter Unavailability Management API
 *
 * GET: List unavailable date ranges
 * POST: Create unavailability block
 * DELETE: Remove unavailability block
 *
 * @route /api/charters/[id]/unavailability
 */

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUnavailability } from "@/lib/services/availability-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Request validation schemas
const UnavailabilityCreateSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  reason: z.string().optional(),
});

const UnavailabilityDeleteSchema = z.object({
  unavailabilityId: z.string(),
});

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

    return NextResponse.json({
      unavailability,
      count: unavailability.length,
    });
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
    const body = await request.json();
    const validation = UnavailabilityCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { startDate, endDate, reason } = validation.data;
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate date range (allow same day for single-day blocks)
    if (start > end) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Validate no overlapping blocks
    const validationResult = await validateUnavailability(
      charterId,
      start,
      end
    );
    if (!validationResult.canCreate) {
      return NextResponse.json(
        {
          error:
            validationResult.message || "Cannot create unavailability block",
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
        reason,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(
      {
        unavailability,
        message: "Unavailability block created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating unavailability:", error);
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
