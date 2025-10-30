/**
 * GET /api/notifications
 * List user's notifications with pagination
 */

import { authOptions } from "@/lib/auth";
import { getUserNotifications } from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor") || undefined;

    const result = await getUserNotifications(session.user.id, {
      unreadOnly,
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Notifications API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
