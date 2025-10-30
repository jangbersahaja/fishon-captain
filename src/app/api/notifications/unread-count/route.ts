/**
 * GET /api/notifications/unread-count
 * Get user's unread notification count
 */

import { authOptions } from "@/lib/auth";
import { getUnreadCount } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[Notifications Count API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
