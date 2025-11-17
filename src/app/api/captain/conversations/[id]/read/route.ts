import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/captain/conversations/[id]/read
 *
 * Mark all messages in a conversation as read (for captain)
 * This updates captainUnreadCount to 0 and marks received messages as READ
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      logger.warn("Unauthorized mark-as-read attempt", {
        sessionExists: false,
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;
    const { id: conversationId } = await params;

    // 2. Rate limiting
    const rateLimitResult = await rateLimit({
      key: `mark-read:${userId}`,
      windowMs: 60 * 1000, // 1 minute
      max: 30, // 30 requests per minute
    });

    if (!rateLimitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
    }

    // 3. Fetch conversation from market DB
    const conversation = await prismaMarket.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        charterId: true,
        ownerId: true,
        captainUnreadCount: true,
      },
    });

    if (!conversation) {
      logger.warn("Conversation not found for mark-as-read", {
        conversationId,
        userId,
      });
      return applySecurityHeaders(
        NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      );
    }

    // 4. Verify captain owns this conversation
    // Check if user owns the charter associated with this conversation
    const charter = await prisma.charter.findUnique({
      where: { id: conversation.charterId },
      select: { ownerId: true },
    });

    if (!charter || charter.ownerId !== userId) {
      logger.warn("Unauthorized mark-as-read attempt - not owner", {
        conversationId,
        userId,
        charterOwnerId: charter?.ownerId,
      });
      return applySecurityHeaders(
        NextResponse.json(
          { error: "You do not have permission to access this conversation" },
          { status: 403 }
        )
      );
    }

    // 5. Mark messages as READ in market DB
    const readAt = new Date();

    // Update all messages from angler (not sent by captain) to READ status
    const updatedMessages = await prismaMarket.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId }, // Only mark received messages
        status: { not: "READ" }, // Only update if not already read
        deletedAt: null,
      },
      data: {
        status: "READ",
        readAt,
      },
    });

    // 6. Reset captain's unread count to 0
    const updatedConversation = await prismaMarket.conversation.update({
      where: { id: conversationId },
      data: { captainUnreadCount: 0 },
      select: {
        id: true,
        captainUnreadCount: true,
        anglerUnreadCount: true,
        lastMessageAt: true,
        lastMessagePreview: true,
      },
    });

    // 7. Trigger Pusher events for real-time updates
    if (process.env.PUSHER_APP_ID) {
      try {
        const { getPusherServer } = await import("@/lib/pusher/server");
        const pusher = getPusherServer();

        if (pusher) {
          // Trigger message.read event in conversation channel
          await pusher.trigger(
            `private-conversation.${conversationId}`,
            "message.read",
            {
              userId,
              readAt: readAt.toISOString(),
              conversationId,
            }
          );

          // Trigger conversation.updated event in user channel to update sidebar
          await pusher.trigger(
            `private-user.${userId}`,
            "conversation.updated",
            {
              conversationId,
              lastMessageAt:
                updatedConversation.lastMessageAt?.toISOString() ||
                new Date().toISOString(),
              lastMessagePreview: updatedConversation.lastMessagePreview || "",
              captainUnreadCount: 0, // Updated to 0
            }
          );
        }
      } catch (pusherError) {
        logger.error("Failed to trigger Pusher events", {
          error:
            pusherError instanceof Error
              ? pusherError.message
              : String(pusherError),
          conversationId,
        });
        // Don't throw - marking as read was successful
      }
    }

    logger.info("Captain marked conversation as read", {
      conversationId,
      userId,
      messagesMarked: updatedMessages.count,
      previousUnread: conversation.captainUnreadCount,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        conversation: updatedConversation,
        messagesMarked: updatedMessages.count,
      })
    );
  } catch (error) {
    logger.error("Error marking conversation as read", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        { error: "Failed to mark conversation as read" },
        { status: 500 }
      )
    );
  }
}
