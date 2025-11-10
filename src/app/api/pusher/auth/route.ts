/**
 * POST /api/pusher/auth
 * Pusher authentication endpoint for private channels
 */

import authOptions from "@/lib/auth";
import { getPusherServer } from "@/lib/pusher/server";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    console.log("🔐 [Pusher Auth] Received authentication request");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.warn("⚠️ [Pusher Auth] Unauthorized - no session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    console.log("🔐 [Pusher Auth] Auth details:", {
      userId: session.user.id,
      socketId,
      channelName,
    });

    if (!socketId || !channelName) {
      console.warn(
        "⚠️ [Pusher Auth] Bad request - missing socketId or channelName"
      );
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const userId = session.user.id;

    // Verify user can access this channel
    // Support both private-user.{userId} and private-conversation.{id} channels
    // Note: Use dot separator (.) not dash (-) per Pusher conventions
    const isUserChannel = channelName === `private-user.${userId}`;
    const isConversationChannel = channelName.startsWith(
      "private-conversation."
    );

    if (!isUserChannel && !isConversationChannel) {
      console.warn("⚠️ [Pusher Auth] Forbidden - channel not accessible:", {
        requested: channelName,
        userId,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Authenticate the user for this channel
    const pusher = getPusherServer();
    if (!pusher) {
      console.error("❌ [Pusher Auth] Pusher not configured");
      return NextResponse.json(
        { error: "Pusher not configured" },
        { status: 500 }
      );
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName);

    console.log("✅ [Pusher Auth] Successfully authenticated user for channel");
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("❌ [Pusher Auth] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
