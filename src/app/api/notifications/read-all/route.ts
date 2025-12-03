/**
 * PATCH /api/notifications/read-all
 * Mark all user's notifications as read
 * Supports admin bypass via adminUserId query param
 */

import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adminUserId = searchParams.get("adminUserId") || undefined;

    // Use admin bypass to get effective user ID
    const effectiveUserId = getEffectiveUserId({
      session,
      query: { adminUserId },
    });

    if (!effectiveUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const result = await markAllNotificationsRead(effectiveUserId);

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("[Notifications Read All API] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
