/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 *
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */

import { authOptions } from "@/lib/auth";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/services/notification-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getUserPreferences(session.user.id);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("[Notification Preferences API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const preferences = await updateUserPreferences(session.user.id, body);

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("[Notification Preferences Update API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
