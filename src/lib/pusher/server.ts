/**
 * Pusher Server Configuration
 * Real-time notification delivery via Pusher Channels
 */

import Pusher from "pusher";

let pusherServerInstance: Pusher | null = null;

/**
 * Get or initialize Pusher server instance (lazy initialization)
 * Returns null in test/dev environments where Pusher is not configured
 */
export function getPusherServer(): Pusher | null {
  // Return existing instance if already initialized
  if (pusherServerInstance) return pusherServerInstance;

  // Check if all required environment variables are present
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    // In test/dev environments, log a warning but don't throw
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Pusher] Missing environment variables. Real-time notifications disabled."
      );
      return null;
    }

    // In production, this is a critical error
    throw new Error(
      "Missing Pusher environment variables. Please set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and PUSHER_CLUSTER in .env"
    );
  }

  // Initialize Pusher
  pusherServerInstance = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });

  return pusherServerInstance;
}

/**
 * Trigger a notification to a specific user's private channel
 * @param userId - User ID to send notification to
 * @param notification - Notification data
 */
export async function triggerNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    message: string;
    actionUrl?: string | null;
    actionLabel?: string | null;
    createdAt: Date;
  }
) {
  const pusher = getPusherServer();

  // Gracefully skip if Pusher is not configured
  if (!pusher) {
    console.log(`[Pusher] Skipping notification (Pusher not configured)`);
    return { success: true, skipped: true };
  }

  try {
    await pusher.trigger(`private-user-${userId}`, "notification", {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    });

    console.log(
      `[Pusher] Notification sent to user ${userId}: ${notification.type}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[Pusher] Failed to send notification to user ${userId}:`,
      error
    );
    return { success: false, error };
  }
}

/**
 * Trigger notification count update to a user
 * @param userId - User ID
 * @param count - New unread notification count
 */
export async function triggerNotificationCount(userId: string, count: number) {
  const pusher = getPusherServer();

  // Gracefully skip if Pusher is not configured
  if (!pusher) {
    console.log(`[Pusher] Skipping count update (Pusher not configured)`);
    return { success: true, skipped: true };
  }

  try {
    await pusher.trigger(`private-user-${userId}`, "notification-count", {
      count,
    });

    console.log(
      `[Pusher] Count update sent to user ${userId}: ${count} unread`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[Pusher] Failed to send count update to user ${userId}:`,
      error
    );
    return { success: false, error };
  }
}

/**
 * Trigger new message event in a conversation
 * @param conversationId - Conversation ID
 * @param message - Message data
 */
export async function triggerMessageNew(
  conversationId: string,
  message: {
    id: string;
    senderId: string;
    senderType: string;
    senderName: string;
    content: string;
    contentType: string;
    systemType?: string | null;
    createdAt: Date;
  }
) {
  const pusher = getPusherServer();

  if (!pusher) {
    console.log(`[Pusher] Skipping message event (Pusher not configured)`);
    return { success: true, skipped: true };
  }

  try {
    await pusher.trigger(
      `private-conversation.${conversationId}`,
      "message.new",
      {
        ...message,
        createdAt: message.createdAt.toISOString(),
      }
    );

    console.log(
      `[Pusher] Message sent to conversation ${conversationId}: ${message.id}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[Pusher] Failed to send message to conversation ${conversationId}:`,
      error
    );
    return { success: false, error };
  }
}

/**
 * Trigger read receipt event in a conversation
 * @param conversationId - Conversation ID
 * @param userId - User ID who read
 * @param readAt - Read timestamp
 */
export async function triggerMessageRead(
  conversationId: string,
  userId: string,
  readAt: Date
) {
  const pusher = getPusherServer();

  if (!pusher) {
    console.log(`[Pusher] Skipping read event (Pusher not configured)`);
    return { success: true, skipped: true };
  }

  try {
    await pusher.trigger(
      `private-conversation.${conversationId}`,
      "message.read",
      {
        userId,
        readAt: readAt.toISOString(),
      }
    );

    console.log(`[Pusher] Read receipt sent to conversation ${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error(
      `[Pusher] Failed to send read receipt to conversation ${conversationId}:`,
      error
    );
    return { success: false, error };
  }
}

/**
 * Trigger typing indicator in a conversation
 * @param conversationId - Conversation ID
 * @param userId - User who is typing
 * @param isTyping - Whether user is typing
 */
export async function triggerTyping(
  conversationId: string,
  userId: string,
  isTyping: boolean
) {
  const pusher = getPusherServer();

  if (!pusher) {
    console.log(`[Pusher] Skipping typing event (Pusher not configured)`);
    return { success: true, skipped: true };
  }

  try {
    await pusher.trigger(`private-conversation.${conversationId}`, "typing", {
      userId,
      isTyping,
    });

    console.log(
      `[Pusher] Typing indicator sent to conversation ${conversationId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[Pusher] Failed to send typing indicator to conversation ${conversationId}:`,
      error
    );
    return { success: false, error };
  }
}
