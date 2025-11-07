import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const CharterUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  charterType: z.string().min(1).optional(),
  startingPoint: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  postcode: z.string().min(1).optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  amenities: z.array(z.string()).optional(),
  policies: z
    .object({
      licenseProvided: z.boolean(),
      catchAndKeep: z.boolean(),
      catchAndRelease: z.boolean(),
      childFriendly: z.boolean(),
      liveBaitProvided: z.boolean(),
      alcoholNotAllowed: z.boolean(),
      smokingNotAllowed: z.boolean(),
    })
    .optional(),
  pickup: z
    .object({
      fee: z.number().nullable(),
      notes: z.string().nullable(),
      areas: z.array(z.string()),
    })
    .nullable()
    .optional(),
});

// PATCH /api/captain/charters/[id] - Update charter
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
    const charterId = params.id;

    // Verify charter exists and user owns it
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { ownerId: true },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    if (charter.ownerId !== effectiveUserId) {
      return NextResponse.json(
        { error: "You do not have permission to edit this charter" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = CharterUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid charter data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const {
      amenities,
      policies,
      pickup,
      latitude,
      longitude,
      description,
      ...charterData
    } = parsed.data;

    // Build update data object, only including defined values
    const updateData: Record<string, unknown> = { ...charterData };
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;
    if (description !== undefined) updateData.description = description;

    // Update charter basic details
    await prisma.charter.update({
      where: { id: charterId },
      data: updateData,
    });

    // Update amenities if provided
    if (amenities !== undefined) {
      // Delete existing amenities
      await prisma.charterAmenity.deleteMany({
        where: { charterId },
      });

      // Create new amenities
      if (amenities.length > 0) {
        await prisma.charterAmenity.createMany({
          data: amenities.map((label) => ({ charterId, label })),
        });
      }
    }

    // Update policies if provided
    if (policies !== undefined) {
      const existingPolicies = await prisma.policies.findUnique({
        where: { charterId },
      });

      if (existingPolicies) {
        await prisma.policies.update({
          where: { charterId },
          data: policies,
        });
      } else {
        await prisma.policies.create({
          data: {
            charterId,
            ...policies,
          },
        });
      }
    }

    // Update pickup if provided
    if (pickup !== undefined) {
      if (pickup === null) {
        // Delete pickup if exists
        const existingPickup = await prisma.pickup.findUnique({
          where: { charterId },
        });

        if (existingPickup) {
          await prisma.pickup.delete({
            where: { charterId },
          });
        }
      } else {
        // Upsert pickup
        const existingPickup = await prisma.pickup.findUnique({
          where: { charterId },
        });

        if (existingPickup) {
          // Delete existing areas
          await prisma.pickupArea.deleteMany({
            where: { pickupId: existingPickup.id },
          });

          // Update pickup and create new areas
          await prisma.pickup.update({
            where: { charterId },
            data: {
              fee: pickup.fee,
              notes: pickup.notes,
              areas: {
                create: pickup.areas.map((label) => ({ label })),
              },
            },
          });
        } else {
          // Create new pickup with areas
          await prisma.pickup.create({
            data: {
              charterId,
              fee: pickup.fee,
              notes: pickup.notes,
              areas: {
                create: pickup.areas.map((label) => ({ label })),
              },
            },
          });
        }
      }
    }

    // Fetch updated charter
    const updatedCharter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: {
        id: true,
        name: true,
        charterType: true,
        startingPoint: true,
        city: true,
        state: true,
        postcode: true,
        latitude: true,
        longitude: true,
        description: true,
        backupPhone: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedCharter);
  } catch (error) {
    console.error("Error updating charter:", error);
    return NextResponse.json(
      { error: "Failed to update charter" },
      { status: 500 }
    );
  }
}
