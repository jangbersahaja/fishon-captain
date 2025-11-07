import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TripUpdateSchema = z.object({
  charterId: z.string().min(1).optional(),
  name: z.string().min(1).max(200).optional(),
  tripType: z.string().min(1).max(100).optional(),
  price: z.number().positive().optional(),
  durationHours: z.number().int().min(1).max(24).optional(),
  maxAnglers: z.number().int().min(1).max(99).optional(),
  style: z.enum(["PRIVATE", "SHARED"]).optional(),
  description: z.string().nullable().optional(),
  promoPrice: z.number().positive().nullable().optional(),
  species: z.array(z.string()).optional(),
  startTimes: z.array(z.string()).optional(),
  techniques: z.array(z.string()).optional(),
});

// PATCH /api/captain/trips/[id] - Update trip
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
    const tripId = params.id;

    // Verify trip exists and user owns the charter
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        charter: {
          select: { ownerId: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.charter.ownerId !== effectiveUserId) {
      return NextResponse.json(
        { error: "You do not have permission to edit this trip" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = TripUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trip data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // If changing charter, verify user owns the new charter
    if (parsed.data.charterId && parsed.data.charterId !== trip.charterId) {
      const newCharter = await prisma.charter.findUnique({
        where: { id: parsed.data.charterId },
        select: { ownerId: true },
      });

      if (!newCharter || newCharter.ownerId !== effectiveUserId) {
        return NextResponse.json(
          {
            error:
              "You do not have permission to move this trip to the selected charter",
          },
          { status: 403 }
        );
      }
    }

    // Update trip with transaction to handle related data
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // Update basic trip data
      await tx.trip.update({
        where: { id: tripId },
        data: {
          charterId: parsed.data.charterId,
          name: parsed.data.name,
          tripType: parsed.data.tripType,
          price: parsed.data.price,
          durationHours: parsed.data.durationHours,
          maxAnglers: parsed.data.maxAnglers,
          style: parsed.data.style,
          description: parsed.data.description,
          promoPrice: parsed.data.promoPrice,
        },
      });

      // Update species if provided
      if (parsed.data.species !== undefined) {
        await tx.tripSpecies.deleteMany({ where: { tripId } });
        if (parsed.data.species.length > 0) {
          await tx.tripSpecies.createMany({
            data: parsed.data.species.map((value) => ({ tripId, value })),
          });
        }
      }

      // Update start times if provided
      if (parsed.data.startTimes !== undefined) {
        await tx.tripStartTime.deleteMany({ where: { tripId } });
        if (parsed.data.startTimes.length > 0) {
          await tx.tripStartTime.createMany({
            data: parsed.data.startTimes.map((value) => ({ tripId, value })),
          });
        }
      }

      // Update techniques if provided
      if (parsed.data.techniques !== undefined) {
        await tx.tripTechnique.deleteMany({ where: { tripId } });
        if (parsed.data.techniques.length > 0) {
          await tx.tripTechnique.createMany({
            data: parsed.data.techniques.map((value) => ({ tripId, value })),
          });
        }
      }

      // Fetch complete trip with relations
      return tx.trip.findUnique({
        where: { id: tripId },
        include: {
          species: true,
          startTimes: true,
          techniques: true,
        },
      });
    });

    return NextResponse.json(updatedTrip);
  } catch (error) {
    console.error("Error updating trip:", error);
    return NextResponse.json(
      { error: "Failed to update trip" },
      { status: 500 }
    );
  }
}

// DELETE /api/captain/trips/[id] - Delete trip
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
    const tripId = params.id;

    // Verify trip exists and user owns the charter
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        charter: {
          select: { ownerId: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    if (trip.charter.ownerId !== effectiveUserId) {
      return NextResponse.json(
        { error: "You do not have permission to delete this trip" },
        { status: 403 }
      );
    }

    // Delete trip and its related data (cascade)
    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip:", error);
    return NextResponse.json(
      { error: "Failed to delete trip" },
      { status: 500 }
    );
  }
}
