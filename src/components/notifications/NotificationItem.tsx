/**
 * NotificationItem Component
 *
 * Individual notification display with icon, title, message, timestamp, and actions.
 * Handles different notification types with appropriate icons and colors.
 */

"use client";

import type { Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Ban,
  Bell,
  CheckCircle2,
  DollarSign,
  Info,
  Megaphone,
  Star,
  XCircle,
} from "lucide-react";
import Link from "next/link";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  variant?: "default" | "compact";
  className?: string;
}

const notificationIcons: Record<string, React.ElementType> = {
  BOOKING_RECEIVED: Bell,
  BOOKING_PAID: DollarSign,
  BOOKING_CANCELLED: Ban,
  REVIEW_RECEIVED: Star,
  CHARTER_APPROVED: CheckCircle2,
  CHARTER_REJECTED: XCircle,
  CHARTER_UPDATED: Info,
  ACCOUNT_VERIFIED: CheckCircle2,
  PROFILE_INCOMPLETE: Info,
  SYSTEM_ANNOUNCEMENT: Megaphone,
};

const notificationColors: Record<string, string> = {
  BOOKING_RECEIVED: "text-blue-500",
  BOOKING_PAID: "text-emerald-500",
  BOOKING_CANCELLED: "text-orange-500",
  REVIEW_RECEIVED: "text-yellow-500",
  CHARTER_APPROVED: "text-green-500",
  CHARTER_REJECTED: "text-red-500",
  CHARTER_UPDATED: "text-blue-500",
  ACCOUNT_VERIFIED: "text-green-500",
  PROFILE_INCOMPLETE: "text-orange-500",
  SYSTEM_ANNOUNCEMENT: "text-purple-500",
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  variant = "default",
  className,
}: NotificationItemProps) {
  const Icon = notificationIcons[notification.type] || Info;
  const iconColor = notificationColors[notification.type] || "text-gray-500";
  const isUnread = notification.status === "UNREAD";

  const handleClick = () => {
    if (isUnread && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
      if (notification.actionUrl) {
        window.location.href = notification.actionUrl;
      }
    }
  };

  const content = (
    <div
      className={cn(
        "flex gap-3 rounded-lg p-3 sm:p-4 transition-colors min-h-[60px]",
        isUnread && "bg-blue-50 dark:bg-blue-950/20",
        notification.actionUrl &&
          "cursor-pointer hover:bg-accent active:bg-accent/80",
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={notification.actionUrl ? 0 : undefined}
      role={notification.actionUrl ? "button" : undefined}
      aria-label={
        notification.actionUrl
          ? `${notification.title}. ${notification.message}. ${isUnread ? "Unread. " : ""}Press Enter to ${notification.actionLabel || "view"}`
          : `${notification.title}. ${notification.message}. ${isUnread ? "Unread" : "Read"}`
      }
    >
      {/* Icon */}
      <div className={cn("flex-shrink-0 pt-0.5", iconColor)}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={cn("text-sm font-medium", isUnread && "font-semibold")}
            >
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
              {notification.message}
            </p>
          </div>

          {isUnread && (
            <div className="flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          )}
        </div>

        {/* Timestamp and Action */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.createdAt), {
              addSuffix: true,
            })}
          </span>

          {notification.actionLabel && variant === "default" && (
            <span className="text-xs text-primary">
              {notification.actionLabel} →
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link href={notification.actionUrl} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
