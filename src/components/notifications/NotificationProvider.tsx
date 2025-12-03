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
import { createContext, Suspense, useContext } from "react";

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

// Default context value for when Suspense is loading
const defaultContextValue: NotificationContextValue = {
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  error: null,
  hasMore: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  fetchMore: () => {},
  refresh: () => {},
};

const NotificationContext =
  createContext<NotificationContextValue>(defaultContextValue);

function NotificationProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const notificationState = useNotifications();

  // Only log in development with debug flag
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_NOTIFICATIONS_DEBUG === "1"
  ) {
    console.log("🔵 [NotificationProvider] Mounting provider...");
    console.log("🔵 [NotificationProvider] Hook state:", {
      hasNotifications: notificationState.notifications.length,
      unreadCount: notificationState.unreadCount,
      isLoading: notificationState.isLoading,
    });
  }

  return (
    <NotificationContext.Provider value={notificationState}>
      {children}
    </NotificationContext.Provider>
  );
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <NotificationContext.Provider value={defaultContextValue}>
          {children}
        </NotificationContext.Provider>
      }
    >
      <NotificationProviderInner>{children}</NotificationProviderInner>
    </Suspense>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  return context;
}
