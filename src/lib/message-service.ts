import { prismaMarket } from "@/lib/prisma-market";

/**
 * Message Service - Fishon Captain
 *
 * Handles captain-side messaging operations
 * - Read conversations and messages via prisma-market
 * - Send messages via fishon-market API
 *
 * All message data is stored in fishon-market DB
 * Captain app only has read access via schema-market.prisma
 */

// ============================================================================
// CONVERSATION OPERATIONS (Read-only via prisma-market)
// ============================================================================

/**
 * Get all conversations for a captain (by charter IDs)
 * Filters conversations where captain owns the charter
 */
export async function getCaptainConversations(
  charterIds: string[],
  limit: number = 20,
  cursor?: string
) {
  if (!charterIds || charterIds.length === 0) {
    return {
      conversations: [],
      nextCursor: null,
      hasMore: false,
      totalUnread: 0,
    };
  }

  const conversations = await prismaMarket.conversation.findMany({
    where: {
      charterId: { in: charterIds },
    },
    orderBy: { lastMessageAt: "desc" },
    take: limit + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    select: {
      id: true,
      bookingId: true,
      charterId: true,
      ownerId: true,
      anglerId: true,
      status: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      lastMessageBy: true,
      anglerUnreadCount: true,
      captainUnreadCount: true,
      createdAt: true,
    },
  });

  const hasMore = conversations.length > limit;
  const items = conversations.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  const totalUnread = items.reduce(
    (sum: number, conv: { captainUnreadCount: number }) => {
      return sum + conv.captainUnreadCount;
    },
    0
  );

  return {
    conversations: items,
    nextCursor,
    hasMore,
    totalUnread,
  };
}

/**
 * Get a single conversation (read-only)
 */
export async function getConversation(conversationId: string) {
  const conversation = await prismaMarket.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      bookingId: true,
      charterId: true,
      ownerId: true,
      anglerId: true,
      status: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      lastMessageBy: true,
      anglerUnreadCount: true,
      captainUnreadCount: true,
      closedAt: true,
      closedBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

// ============================================================================
// MESSAGE OPERATIONS (Read-only via prisma-market)
// ============================================================================

/**
 * Get paginated messages for a conversation
 * Returns cursor-based pagination (most recent first)
 */
export async function getMessages(
  conversationId: string,
  limit: number = 50,
  cursor?: string
) {
  const messages = await prismaMarket.message.findMany({
    where: {
      conversationId,
      deletedAt: null, // Exclude soft-deleted
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    select: {
      id: true,
      conversationId: true,
      senderId: true,
      senderType: true,
      senderName: true,
      content: true,
      contentType: true,
      systemType: true,
      bookingSnapshot: true,
      isQuickReply: true,
      status: true,
      deliveredAt: true,
      readAt: true,
      metadata: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const hasMore = messages.length > limit;
  const items = messages.slice(0, limit).reverse(); // Reverse for chronological order
  const nextCursor = hasMore ? messages[limit]?.id : null;

  return {
    messages: items,
    nextCursor,
    hasMore,
  };
}

// ============================================================================
// MESSAGE SENDING (Via API to fishon-market)
// ============================================================================

/**
 * Send a message via fishon-market API
 * This should be called with appropriate authorization
 */
export async function sendMessageViaAPI(
  conversationId: string,
  content: string,
  apiUrl: string,
  authToken: string
) {
  const response = await fetch(
    `${apiUrl}/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        content,
        contentType: "text",
        isQuickReply: false,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  return response.json();
}
