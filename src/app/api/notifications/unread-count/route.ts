/**
 * GET /api/notifications/unread-count
 * Get user's unread notification count
 * Supports admin bypass via adminUserId query param
 */

import { getEffectiveUserId } from "@/lib/adminBypass";
import { authOptions } from "@/lib/auth";
import { getUnreadCount } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

    const count = await getUnreadCount(effectiveUserId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[Notifications Count API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
