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
 * Get enriched conversations with angler names, booking details, and latest message
 * Used for captain conversations list page
 */
export async function getCaptainConversationsEnriched(charterIds: string[]) {
  if (!charterIds || charterIds.length === 0) {
    return [];
  }

  // Get conversations for these charters
  const conversations = await prismaMarket.conversation.findMany({
    where: {
      charterId: { in: charterIds },
    },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          userId: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderType: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  // Enrich with angler names
  const enrichedConversations = await Promise.all(
    conversations.map(async (conversation: (typeof conversations)[number]) => {
      let anglerName = "Angler";
      let anglerAvatar: string | null = null;

      if (conversation.booking && conversation.booking.userId) {
        // Fetch user info (works for both registered and guest users)
        const user = await prismaMarket.marketUser.findUnique({
          where: { id: conversation.booking.userId },
          select: { name: true, image: true },
        });
        anglerName = user?.name || "Angler";
        anglerAvatar = user?.image || null;
      }

      return {
        ...conversation,
        anglerName,
        anglerAvatar,
      };
    })
  );

  return enrichedConversations;
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

/**
 * Get enriched conversation with angler details, booking info, and messages
 * Used for captain conversation detail page
 */
export async function getConversationEnriched(conversationId: string) {
  const conversation = await prismaMarket.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          charterId: true,
          date: true,
          days: true,
          finalPrice: true,
          note: true,
          startTime: true,
          guests: true,
          userId: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          senderType: true,
          senderName: true,
          content: true,
          contentType: true,
          systemType: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Get charter name from captain's database
  let charterName = "Charter";
  if (conversation.charterId) {
    const { prisma } = await import("@/lib/prisma");
    const charter = await prisma.charter.findUnique({
      where: { id: conversation.charterId },
      select: { name: true },
    });
    charterName = charter?.name || "Charter";
  }

  // Get angler info
  let anglerName = "Angler";
  let anglerEmail = "";
  let anglerPhone = "";
  let anglerAvatar: string | null = null;

  if (conversation.booking && conversation.booking.userId) {
    // Fetch user info (works for both registered and guest users)
    const user = await prismaMarket.marketUser.findUnique({
      where: { id: conversation.booking.userId },
      select: { name: true, email: true, image: true, phone: true },
    });
    anglerName = user?.name || "Angler";
    anglerEmail = user?.email || "";
    anglerPhone = user?.phone || "";
    anglerAvatar = user?.image || null;
  }

  // Parse guests JSON
  let adults = 0;
  let children = 0;
  if (conversation.booking?.guests) {
    try {
      const guestsData =
        typeof conversation.booking.guests === "string"
          ? JSON.parse(conversation.booking.guests)
          : conversation.booking.guests;
      adults = guestsData?.adults || 0;
      children = guestsData?.children || 0;
    } catch (error) {
      console.error("Error parsing guests JSON:", error);
    }
  }

  return {
    id: conversation.id,
    anglerId: conversation.anglerId,
    charterId: conversation.charterId,
    ownerId: conversation.ownerId,
    status: conversation.status,
    angler: {
      name: anglerName,
      email: anglerEmail,
      phone: anglerPhone,
      avatar: anglerAvatar,
    },
    booking: conversation.booking
      ? {
          id: conversation.booking.id,
          status: conversation.booking.status,
          charterName,
          note: conversation.booking.note || undefined,
          date: conversation.booking.date.toISOString(),
          days: conversation.booking.days,
          adults,
          children,
          totalPrice: Number(conversation.booking.finalPrice),
          startTime: conversation.booking.startTime || undefined,
        }
      : null,
    messages: conversation.messages.map(
      (msg: (typeof conversation.messages)[number]) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderType: msg.senderType,
        senderName: msg.senderName || "User",
        content: msg.content,
        contentType: msg.contentType,
        systemType: msg.systemType || undefined,
        status: (msg.status || "SENT") as "SENT" | "DELIVERED" | "READ",
        createdAt: msg.createdAt.toISOString(),
      })
    ),
  };
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
