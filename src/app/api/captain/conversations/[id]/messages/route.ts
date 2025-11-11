import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/captain/conversations/[id]/messages
 *
 * Captain sends a message in a conversation
 * This endpoint verifies captain ownership and proxies to fishon-market DB
 *
 * Request body:
 * {
 *   content: string
 *   contentType?: string (default: "text")
 *   isQuickReply?: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    const session = await getServerSession(authOptions);

    // Verify authentication
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limit: 30 messages per minute per captain
    const limitResult = await rateLimit({
      key: `send-message:${userId}`,
      max: 30,
      windowMs: 60 * 1000,
    });

    if (!limitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limit exceeded. Max 30 messages per minute." },
          { status: 429 }
        )
      );
    }

    // Get conversation from fishon-market
    const conversation = await prismaMarket.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        charterId: true,
        status: true,
      },
    });

    if (!conversation) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      );
    }

    // Verify the captain owns the charter in this conversation
    const charter = await prisma.charter.findUnique({
      where: { id: conversation.charterId },
      select: { ownerId: true, name: true },
    });

    if (!charter || charter.ownerId !== userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Check if conversation is closed
    if (conversation.status === "CLOSED") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Cannot send message to closed conversation" },
          { status: 400 }
        )
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, contentType = "text", isQuickReply = false } = body;

    if (!content || content.trim().length === 0) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Message content is required" },
          { status: 400 }
        )
      );
    }

    // Get captain profile for sender name
    const captainProfile = await prisma.captainProfile.findUnique({
      where: { userId },
      select: { displayName: true, firstName: true },
    });

    const senderName =
      captainProfile?.displayName ||
      captainProfile?.firstName ||
      session.user.name ||
      "Captain";

    logger.info("Attempting to create message", {
      conversationId,
      userId,
      senderName,
      contentLength: content.length,
    });

    // Create message in fishon-market DB
    let message;
    try {
      message = await prismaMarket.message.create({
        data: {
          conversationId,
          senderId: userId,
          senderType: "captain",
          senderName,
          content: content.trim(),
          contentType,
          isQuickReply,
          status: "SENT",
        },
      });

      logger.info("Message created successfully", {
        messageId: message.id,
        conversationId,
      });
    } catch (createError) {
      logger.error("Failed to create message", {
        error:
          createError instanceof Error
            ? createError.message
            : String(createError),
        conversationId,
        userId,
      });
      throw createError;
    }

    // Update conversation last message metadata
    try {
      await prismaMarket.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: content.substring(0, 100),
          lastMessageBy: userId,
          anglerUnreadCount: { increment: 1 }, // Increment angler's unread count
        },
      });
    } catch (updateError) {
      logger.error("Failed to update conversation metadata", {
        error:
          updateError instanceof Error
            ? updateError.message
            : String(updateError),
        conversationId,
      });
      // Don't throw - message was created successfully
    }

    // Trigger Pusher event for real-time delivery
    if (process.env.PUSHER_APP_ID) {
      const { getPusherServer } = await import("@/lib/pusher/server");
      const pusher = getPusherServer();

      if (pusher) {
        // Trigger message.new event for chat updates
        await pusher.trigger(
          `private-conversation.${conversationId}`,
          "message.new",
          {
            id: message.id,
            senderId: message.senderId,
            senderType: message.senderType,
            senderName: message.senderName,
            content: message.content,
            contentType: message.contentType,
            isQuickReply: message.isQuickReply,
            status: message.status,
            createdAt: message.createdAt.toISOString(),
          }
        );

        // Trigger conversation.updated event for sidebar updates
        await pusher.trigger(`private-user.${userId}`, "conversation.updated", {
          conversationId,
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: content.substring(0, 100),
          captainUnreadCount: 0, // Captain sent it
        });
      }
    }

    // Revalidate Server Component data for fresh conversation list
    revalidatePath("/captain/messages");
    revalidatePath(`/captain/messages/${conversationId}`);

    logger.info("Captain sent message", {
      conversationId,
      messageId: message.id,
      captainId: userId,
      contentLength: content.length,
    });

    return applySecurityHeaders(
      NextResponse.json({
        id: message.id,
        senderId: message.senderId,
        senderType: message.senderType,
        senderName: message.senderName,
        content: message.content,
        contentType: message.contentType,
        isQuickReply: message.isQuickReply,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      })
    );
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown",
      cause:
        error instanceof Error && "cause" in error ? error.cause : undefined,
    };

    logger.error(
      "Error in POST /api/captain/conversations/[id]/messages",
      errorDetails
    );

    console.error(
      "❌ CAPTAIN MESSAGE API ERROR:",
      JSON.stringify(errorDetails, null, 2)
    );

    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "Internal server error",
          details:
            process.env.NODE_ENV === "development"
              ? errorDetails.message
              : undefined,
        },
        { status: 500 }
      )
    );
  }
}

/**
 * GET /api/captain/conversations/[id]/messages
 *
 * Get messages for a conversation
 * Captain can only access messages for charters they own
 *
 * Query params:
 * - limit: number of messages to fetch (default: 50, max: 100)
 * - before: cursor for pagination (message ID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100
    );
    const before = searchParams.get("before");

    const session = await getServerSession(authOptions);

    // Verify authentication
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limit: 100 requests per minute per captain
    const limitResult = await rateLimit({
      key: `get-messages:${userId}`,
      max: 100,
      windowMs: 60 * 1000,
    });

    if (!limitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limit exceeded. Max 100 requests per minute." },
          { status: 429 }
        )
      );
    }

    // Get conversation from fishon-market
    const conversation = await prismaMarket.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        charterId: true,
      },
    });

    if (!conversation) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      );
    }

    // Verify the captain owns the charter in this conversation
    const charter = await prisma.charter.findUnique({
      where: { id: conversation.charterId },
      select: { ownerId: true },
    });

    if (!charter || charter.ownerId !== userId) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Forbidden" }, { status: 403 })
      );
    }

    // Fetch messages
    const messages = await prismaMarket.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(before && {
          createdAt: {
            lt: new Date(before),
          },
        }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        contentType: true,
        senderType: true,
        senderName: true,
        senderId: true,
        status: true,
        createdAt: true,
        isQuickReply: true,
        readAt: true,
      },
    });

    // Reverse to get chronological order
    messages.reverse();

    return applySecurityHeaders(
      NextResponse.json({
        messages,
        hasMore: messages.length === limit,
      })
    );
  } catch (error) {
    logger.error("Error in GET /api/captain/conversations/[id]/messages", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
