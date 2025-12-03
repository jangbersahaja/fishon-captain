/**
 * PATCH /api/notifications/[id]/read
 * Mark a specific notification as read
 *
 * DELETE /api/notifications/[id]
 * Delete a specific notification
 *
 * Supports admin bypass via adminUserId query param
 */

import { getEffectiveUserId } from "@/lib/adminBypass";
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

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    await markNotificationRead(notificationId, effectiveUserId);

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

    const resolvedParams = await params;
    const notificationId = resolvedParams.id;

    await deleteNotification(notificationId, effectiveUserId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Notification Delete API] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete notification" },
      { status: 500 }
    );
  }
}
