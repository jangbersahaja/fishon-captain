import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BoatUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(100).optional(),
  lengthFt: z.number().int().min(1).max(999).optional(),
  capacity: z.number().int().min(1).max(99).optional(),
  imageUrl: z.string().url().nullable().optional(),
  charterId: z.string().cuid().optional(), // Required if transferring to another charter
  features: z.array(z.string()).optional(),
});

// PATCH /api/captain/boats/[id] - Update boat
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUserId = req.nextUrl.searchParams.get("adminUserId");
    const effectiveUserId = getEffectiveUserId({
      session,
      query: { adminUserId: adminUserId || undefined },
    });

    if (!effectiveUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const boatId = params.id;

    // Verify boat exists and user owns a charter using this boat
    const boat = await prisma.boat.findUnique({
      where: { id: boatId },
      include: {
        charters: {
          select: { ownerId: true },
        },
      },
    });

    if (!boat) {
      return NextResponse.json({ error: "Boat not found" }, { status: 404 });
    }

    // Verify user owns at least one charter using this boat
    const ownsCharter = boat.charters.some(
      (charter) => charter.ownerId === effectiveUserId
    );

    if (!ownsCharter) {
      return NextResponse.json(
        { error: "You do not have permission to edit this boat" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = BoatUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid boat data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Extract charterId from parsed data for separate handling
    const { charterId, ...boatData } = parsed.data;

    const updatedBoat = await prisma.boat.update({
      where: { id: boatId },
      data: boatData,
    });

    // If charterId provided, transfer this boat to the new charter
    if (charterId) {
      // Verify the new charter belongs to this user
      const newCharter = await prisma.charter.findFirst({
        where: {
          id: charterId,
          ownerId: effectiveUserId,
        },
      });

      if (!newCharter) {
        return NextResponse.json(
          { error: "Target charter not found or access denied" },
          { status: 404 }
        );
      }

      // Get current charter assignment
      const currentCharters = await prisma.charter.findMany({
        where: {
          boatId: boatId,
          ownerId: effectiveUserId,
        },
        select: { id: true },
      });

      // If transferring to a different charter, update assignments
      if (!currentCharters.some((c) => c.id === charterId)) {
        // Unassign from current charter(s)
        await prisma.charter.updateMany({
          where: {
            boatId: boatId,
            ownerId: effectiveUserId,
          },
          data: { boatId: null },
        });

        // Assign to new charter
        await prisma.charter.update({
          where: { id: charterId },
          data: { boatId: updatedBoat.id },
        });
      }
    }

    return NextResponse.json(updatedBoat);
  } catch (error) {
    console.error("Error updating boat:", error);
    return NextResponse.json(
      { error: "Failed to update boat" },
      { status: 500 }
    );
  }
}

// DELETE /api/captain/boats/[id] - Delete boat
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminUserId = req.nextUrl.searchParams.get("adminUserId");
    const effectiveUserId = getEffectiveUserId({
      session,
      query: { adminUserId: adminUserId || undefined },
    });

    if (!effectiveUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const boatId = params.id;

    // Verify boat exists and user owns a charter using this boat
    const boat = await prisma.boat.findUnique({
      where: { id: boatId },
      include: {
        charters: {
          select: { ownerId: true },
        },
      },
    });

    if (!boat) {
      return NextResponse.json({ error: "Boat not found" }, { status: 404 });
    }

    // Verify user owns at least one charter using this boat
    const ownsCharter = boat.charters.some(
      (charter) => charter.ownerId === effectiveUserId
    );

    if (!ownsCharter) {
      return NextResponse.json(
        { error: "You do not have permission to delete this boat" },
        { status: 403 }
      );
    }

    // Check if boat is assigned to any charters
    if (boat.charters.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete boat that is assigned to charters",
          details: `This boat is assigned to ${boat.charters.length} charter(s). Please remove it from all charters first.`,
        },
        { status: 400 }
      );
    }

    await prisma.boat.delete({
      where: { id: boatId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting boat:", error);
    return NextResponse.json(
      { error: "Failed to delete boat" },
      { status: 500 }
    );
  }
}
