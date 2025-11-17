import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Admin-only endpoint to lock/unlock a charter
 * When locked, captains cannot change isActive status
 */
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

    // Only admins can lock/unlock charters
    const role = session.user.role as string | undefined;
    const isAdmin = role === "ADMIN";

    if (!isAdmin) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Admin access required" }, { status: 403 })
      );
    }

    const { id: charterId } = await params;
    const body = await request.json();
    const { isLocked } = body;

    if (typeof isLocked !== "boolean") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "isLocked must be a boolean" },
          { status: 400 }
        )
      );
    }

    // Check if charter exists
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { id: true, name: true, isLocked: true, isActive: true },
    });

    if (!charter) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Charter not found" }, { status: 404 })
      );
    }

    // Update lock status
    // When locking: auto-set to inactive
    // When unlocking: keep inactive (admin/user will manually activate)
    const updatedCharter = await prisma.charter.update({
      where: { id: charterId },
      data: {
        isLocked,
        ...(isLocked ? { isActive: false } : {}), // Auto-set inactive when locking
      },
      select: {
        id: true,
        name: true,
        isLocked: true,
        isActive: true,
      },
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        data: updatedCharter,
        message: isLocked
          ? "Charter locked and set to inactive. Captain cannot change status."
          : "Charter unlocked (remains inactive). Manually activate when ready.",
      })
    );
  } catch (error) {
    console.error("Error updating charter lock status:", error);
    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to update charter lock status" },
        { status: 500 }
      )
    );
  }
}
