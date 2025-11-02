"use client";

import { NotificationErrorBoundary } from "@/components/notifications/NotificationErrorBoundary";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { useNotificationContext } from "@/components/notifications/NotificationProvider";
import { NotificationListSkeleton } from "@/components/notifications/NotificationSkeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function NotificationsPage() {
  return (
    <NotificationErrorBoundary>
      <NotificationsContent />
    </NotificationErrorBoundary>
  );
}

function NotificationsContent() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    hasMore,
    fetchMore,
  } = useNotificationContext();

  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => n.status === "UNREAD")
      : notifications;

  return (
    <div className="px-4 py-8 mx-auto space-y-8 sm:px-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" id="notifications-heading">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="mt-1 text-sm text-gray-600" aria-live="polite">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Link href="/captain/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              size="sm"
              aria-label={`Mark all ${unreadCount} notifications as read`}
            >
              Mark all as read
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v: string) => setFilter(v as "all" | "unread")}
        aria-labelledby="notifications-heading"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
          <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-0">
          {isLoading ? (
            <NotificationListSkeleton count={5} />
          ) : filteredNotifications.length === 0 ? (
            <div className="py-12 text-center" role="status">
              <p className="text-gray-500">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </p>
            </div>
          ) : (
            <>
              <div
                className="bg-white border divide-y rounded-lg shadow-sm"
                role="feed"
                aria-label={`${filter === "unread" ? "Unread" : "All"} notifications`}
                aria-busy={isLoading}
              >
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-6 text-center">
                  <Button
                    onClick={fetchMore}
                    variant="outline"
                    disabled={isLoading}
                    aria-label="Load more notifications"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                        <span className="sr-only">
                          Loading more notifications
                        </span>
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
