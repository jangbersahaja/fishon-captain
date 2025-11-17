import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateStatusSchema = z.object({
  isActive: z.boolean({
    message: "isActive field is required",
  }),
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
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { isActive } = validation.data;

    // Verify charter exists and get ownership info
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { ownerId: true, name: true, isActive: true },
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

    // Prevent unnecessary updates
    if (charter.isActive === isActive) {
      return NextResponse.json({
        success: true,
        message: `Charter is already ${isActive ? "active" : "inactive"}`,
        charter: {
          id: charterId,
          name: charter.name,
          isActive: charter.isActive,
        },
      });
    }

    // Update charter status
    const updated = await prisma.charter.update({
      where: { id: charterId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Charter ${isActive ? "activated" : "deactivated"} successfully`,
      charter: updated,
    });
  } catch (error) {
    console.error("Error updating charter status:", error);
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
