/**
 * NotificationProvider Component
 *
 * Context provider that wraps the entire app to provide notification state.
 * Ensures useNotifications hook is only instantiated once, preventing:
 * - Multiple Pusher connections
 * - Duplicate API calls
 * - Conflicting event handlers
 */

"use client";

import { useNotifications } from "@/hooks/useNotifications";
import { createContext, useContext } from "react";

// Re-export the Notification type from the hook
import type { Notification } from "@/hooks/useNotifications";
export type { Notification } from "@/hooks/useNotifications";

interface NotificationContextValue {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;

  // Actions
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  fetchMore: () => void;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("🔵 [NotificationProvider] Mounting provider...");
  const notificationState = useNotifications();
  console.log("🔵 [NotificationProvider] Hook state:", {
    hasNotifications: notificationState.notifications.length,
    unreadCount: notificationState.unreadCount,
    isLoading: notificationState.isLoading,
  });

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  }
  return context;
}
