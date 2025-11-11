import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const TripSchema = z.object({
  charterId: z.string().min(1, "Charter ID is required"),
  name: z.string().min(1, "Trip name is required").max(200),
  tripType: z.string().min(1, "Trip type is required").max(100),
  price: z.number().positive("Price must be positive"),
  durationHours: z.number().int().min(1).max(24),
  maxAnglers: z.number().int().min(1).max(99),
  style: z.enum(["PRIVATE", "SHARED"]),
  description: z.string().nullable().optional(),
  promoPrice: z.number().positive().nullable().optional(),
  species: z.array(z.string()).default([]),
  startTimes: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),
});

// POST /api/captain/trips - Create new trip
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
    const parsed = TripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trip data", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Verify user owns the charter
    const charter = await prisma.charter.findUnique({
      where: { id: parsed.data.charterId },
      select: { ownerId: true },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    if (charter.ownerId !== effectiveUserId) {
      return NextResponse.json(
        { error: "You do not have permission to add trips to this charter" },
        { status: 403 }
      );
    }

    // Create trip with related data
    const trip = await prisma.trip.create({
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
        species: {
          create: parsed.data.species.map((value) => ({ value })),
        },
        startTimes: {
          create: parsed.data.startTimes.map((value) => ({ value })),
        },
        techniques: {
          create: parsed.data.techniques.map((value) => ({ value })),
        },
      },
      include: {
        species: true,
        startTimes: true,
        techniques: true,
      },
    });

    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error("Error creating trip:", error);
    return NextResponse.json(
      { error: "Failed to create trip" },
      { status: 500 }
    );
  }
}
