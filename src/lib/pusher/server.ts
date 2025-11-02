/**
 * Pusher Server Configuration
 * Real-time notification delivery via Pusher Channels
 */

import Pusher from "pusher";

if (
  !process.env.PUSHER_APP_ID ||
  !process.env.PUSHER_KEY ||
  !process.env.PUSHER_SECRET ||
  !process.env.PUSHER_CLUSTER
) {
  throw new Error(
    "Missing Pusher environment variables. Please set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, and PUSHER_CLUSTER in .env"
  );
}

export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

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
  try {
    const channelName = `private-user-${userId}`;
    const payload = {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    };

    console.log(`📡 [Pusher] Attempting to send notification:`, {
      channel: channelName,
      event: "notification",
      type: notification.type,
      title: notification.title,
      userId,
    });

    await pusherServer.trigger(channelName, "notification", payload);

    console.log(
      `✅ [Pusher] Notification sent successfully to user ${userId}: ${notification.type}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `❌ [Pusher] Failed to send notification to user ${userId}:`,
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
  try {
    await pusherServer.trigger(`private-user-${userId}`, "notification-count", {
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
