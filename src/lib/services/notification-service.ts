/**
 * Notification Service (fishon-captain)
 * Handles notification creation, retrieval, and real-time delivery for captains
 */

import { prisma } from "@/lib/prisma";
import {
  triggerNotification,
  triggerNotificationCount,
} from "@/lib/pusher/server";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  charterId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any> | null;
  expiresAt?: Date;
}

/**
 * Create a new notification and send via Pusher
 */
export async function createNotification(params: CreateNotificationParams) {
  const {
    userId,
    type,
    title,
    message,
    actionUrl,
    actionLabel,
    charterId,
    metadata,
    expiresAt,
  } = params;

  // Create notification in database
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      actionUrl: actionUrl || null,
      actionLabel: actionLabel || null,
      charterId: charterId || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: metadata as any,
      expiresAt: expiresAt || null,
      status: "UNREAD",
    },
  });

  // Send real-time notification via Pusher
  await triggerNotification(userId, {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
    actionLabel: notification.actionLabel,
    createdAt: notification.createdAt,
  });

  // Update unread count
  const unreadCount = await getUnreadCount(userId);
  await triggerNotificationCount(userId, unreadCount);

  return notification;
}

/**
 * Get user's notifications with pagination
 */
export async function getUserNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
    cursor?: string;
  } = {}
) {
  const { unreadOnly = false, limit = 20, cursor } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    userId,
    archivedAt: null,
  };

  if (unreadOnly) {
    whereClause.status = "UNREAD";
  }

  if (cursor) {
    whereClause.id = {
      lt: cursor,
    };
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  const hasMore = notifications.length === limit;
  const nextCursor = hasMore
    ? notifications[notifications.length - 1].id
    : null;

  return {
    notifications,
    nextCursor,
    hasMore,
  };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      userId,
      status: "UNREAD",
      archivedAt: null,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  // Update unread count
  const unreadCount = await getUnreadCount(userId);
  await triggerNotificationCount(userId, unreadCount);

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      status: "UNREAD",
    },
    data: {
      status: "READ",
      readAt: new Date(),
    },
  });

  // Update unread count to 0
  await triggerNotificationCount(userId, 0);

  return result;
}

/**
 * Archive a notification
 */
export async function archiveNotification(
  notificationId: string,
  userId: string
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: "ARCHIVED",
      archivedAt: new Date(),
    },
  });
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
) {
  return prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
}

/**
 * Get or create user notification preferences
 */
export async function getUserPreferences(userId: string) {
  let preferences = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.notificationPreferences.create({
      data: {
        userId,
        inAppEnabled: true,
        emailEnabled: true,
        bookingUpdates: true,
        charterUpdates: true,
        systemUpdates: true,
      },
    });
  }

  return preferences;
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(
  userId: string,
  data: {
    inAppEnabled?: boolean;
    emailEnabled?: boolean;
    bookingUpdates?: boolean;
    charterUpdates?: boolean;
    systemUpdates?: boolean;
  }
) {
  return prisma.notificationPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...data,
    },
    update: data,
  });
}

/**
 * Clean up expired notifications (run as cron job)
 */
export async function cleanupExpiredNotifications() {
  const result = await prisma.notification.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(
    `[Notification] Cleaned up ${result.count} expired notifications`
  );
  return result;
}
