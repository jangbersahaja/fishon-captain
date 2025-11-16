import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const { id: charterId } = await params;
    const body = await request.json();
    const { bookingFlowType, approvalTimeHours, instantBookingEnabled } = body;

    // Validate charter ownership
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { ownerId: true, captainId: true },
    });

    if (!charter) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Charter not found" }, { status: 404 })
      );
    }

    // Check if user owns the charter
    const role = session.user.role as string | undefined;
    const isOwner = charter.ownerId === session.user.id;
    const isAdmin = role === "ADMIN" || role === "STAFF";

    if (!isOwner && !isAdmin) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Validate booking flow type
    if (bookingFlowType && !["MANUAL", "AUTO"].includes(bookingFlowType)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Invalid booking flow type" },
          { status: 400 }
        )
      );
    }

    // Validate approval time hours (1-168 hours)
    if (
      approvalTimeHours !== undefined &&
      (approvalTimeHours < 1 || approvalTimeHours > 168)
    ) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Approval time must be between 1 and 168 hours" },
          { status: 400 }
        )
      );
    }

    // Update charter booking flow settings
    const updateData: {
      bookingFlowType?: "MANUAL" | "AUTO";
      approvalTimeHours?: number;
      instantBookingEnabled?: boolean;
    } = {};

    if (bookingFlowType) updateData.bookingFlowType = bookingFlowType;
    if (approvalTimeHours !== undefined)
      updateData.approvalTimeHours = approvalTimeHours;
    if (instantBookingEnabled !== undefined)
      updateData.instantBookingEnabled = instantBookingEnabled;

    const updatedCharter = await prisma.charter.update({
      where: { id: charterId },
      data: updateData,
      select: {
        id: true,
        bookingFlowType: true,
        approvalTimeHours: true,
        instantBookingEnabled: true,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: updatedCharter,
      })
    );
  } catch (error) {
    console.error("Error updating charter booking flow:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update booking flow" },
        { status: 500 }
      )
    );
  }
}
