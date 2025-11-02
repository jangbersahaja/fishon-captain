/**
 * PATCH /api/notifications/[id]/read
 * Mark a specific notification as read
 *
 * DELETE /api/notifications/[id]
 * Delete a specific notification
 */

import { authOptions } from "@/lib/auth";
import {
  deleteNotification,
  markNotificationRead,
} from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    await markNotificationRead(notificationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notification Read API] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    await deleteNotification(notificationId, session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notification Delete API] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
