import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";

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
    const { isActive } = body;

    if (typeof isActive !== "boolean") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "isActive must be a boolean" },
          { status: 400 }
        )
      );
    }

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

    // Update charter status
    const updatedCharter = await prisma.charter.update({
      where: { id: charterId },
      data: { isActive },
      select: {
        id: true,
        isActive: true,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: updatedCharter,
      })
    );
  } catch (error) {
    console.error("Error updating charter status:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update charter status" },
        { status: 500 }
      )
    );
  }
}
