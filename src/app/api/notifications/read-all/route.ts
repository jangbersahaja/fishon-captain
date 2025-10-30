/**
 * PATCH /api/notifications/read-all
 * Mark all user's notifications as read
 */

import { authOptions } from "@/lib/auth";
import { markAllNotificationsRead } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await markAllNotificationsRead(session.user.id);

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
