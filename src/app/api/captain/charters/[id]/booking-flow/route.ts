import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateBookingFlowSchema = z.object({
  bookingFlowType: z.enum(["MANUAL", "AUTO"], {
    message: "Booking flow type is required",
  }),
  approvalTimeHours: z
    .number()
    .int()
    .min(1, "Approval time must be at least 1 hour")
    .max(168, "Approval time cannot exceed 168 hours (7 days)")
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 }
      );
    }

    const { id: charterId } = await params;

    // Parse and validate request body
    const body = await req.json();
    const validation = updateBookingFlowSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { bookingFlowType, approvalTimeHours } = validation.data;

    // Verify charter exists and get ownership info
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { ownerId: true, name: true },
    });

    if (!charter) {
      return NextResponse.json({ error: "Charter not found" }, { status: 404 });
    }

    // Check ownership (with admin bypass support)
    const effectiveUserId = getEffectiveUserId({
      session,
      query: {
        adminUserId: req.nextUrl.searchParams.get("adminUserId") || undefined,
      },
    });

    if (!effectiveUserId || charter.ownerId !== effectiveUserId) {
      return NextResponse.json(
        { error: "Forbidden - You do not own this charter" },
        { status: 403 }
      );
    }

    // Update charter booking flow settings
    const updateData: {
      bookingFlowType: "MANUAL" | "AUTO";
      approvalTimeHours?: number;
      instantBookingEnabled: boolean;
    } = {
      bookingFlowType,
      instantBookingEnabled: bookingFlowType === "AUTO",
    };

    // Set approval hours for MANUAL flow, default to 24 if not provided
    if (bookingFlowType === "MANUAL") {
      updateData.approvalTimeHours = approvalTimeHours || 24;
    }

    const updated = await prisma.charter.update({
      where: { id: charterId },
      data: updateData,
      select: {
        id: true,
        name: true,
        bookingFlowType: true,
        approvalTimeHours: true,
        instantBookingEnabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Booking flow updated to ${bookingFlowType === "MANUAL" ? "Manual Approval" : "Instant Booking"}`,
      charter: updated,
    });
  } catch (error) {
    console.error("Error updating booking flow:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
