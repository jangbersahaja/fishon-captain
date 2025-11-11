import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const BoatSchema = z.object({
  name: z.string().min(1, "Boat name is required").max(100),
  type: z.string().min(1, "Boat type is required").max(100),
  lengthFt: z.number().int().min(1).max(999),
  capacity: z.number().int().min(1).max(99),
  imageUrl: z.string().url().nullable().optional(),
  charterId: z.string().cuid("Charter assignment is required"),
  features: z.array(z.string()).optional(),
});

// POST /api/captain/boats - Create new boat
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const parsed = BoatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid boat data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify captain profile exists
    const profile = await prisma.captainProfile.findUnique({
      where: { userId: effectiveUserId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Captain profile not found" },
        { status: 404 }
      );
    }

    // Verify the charter belongs to this user
    const charter = await prisma.charter.findFirst({
      where: {
        id: parsed.data.charterId,
        ownerId: effectiveUserId,
      },
    });

    if (!charter) {
      return NextResponse.json(
        { error: "Charter not found or access denied" },
        { status: 404 }
      );
    }

    const boat = await prisma.boat.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        lengthFt: parsed.data.lengthFt,
        capacity: parsed.data.capacity,
        imageUrl: parsed.data.imageUrl || null,
        features: parsed.data.features || [],
      },
    });

    // Assign this boat to the charter
    await prisma.charter.update({
      where: { id: parsed.data.charterId },
      data: { boatId: boat.id },
    });

    return NextResponse.json(boat, { status: 201 });
  } catch (error) {
    console.error("Error creating boat:", error);
    return NextResponse.json(
      { error: "Failed to create boat" },
      { status: 500 }
    );
  }
}
