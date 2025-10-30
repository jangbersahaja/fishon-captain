/**
 * POST /api/notifications/test
 * Create a test notification (development/testing only)
 */

import { authOptions } from "@/lib/auth";
import { createNotification } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a test notification
    const notification = await createNotification({
      userId: session.user.id,
      type: "SYSTEM_ANNOUNCEMENT",
      title: "⚓ Test Notification",
      message:
        "Your notification system is working! This is a test notification sent via Pusher.",
      actionUrl: "/captain/notifications",
      actionLabel: "View All Notifications",
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      notification,
      message: "Test notification created and sent via Pusher",
    });
  } catch (error) {
    console.error("[Test Notification API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create test notification" },
      { status: 500 }
    );
  }
}
