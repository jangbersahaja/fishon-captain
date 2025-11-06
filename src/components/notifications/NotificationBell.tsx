/**
 * NotificationBell Component
 *
 * Bell icon with unread badge that triggers notification dropdown.
 * Shows real-time unread count and highlights when notifications are unread.
 * Combines NotificationBell button with NotificationDropdown.
 */

"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { useNotificationContext } from "./NotificationProvider";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount } = useNotificationContext();
  const hasUnread = unreadCount > 0;

  return (
    <NotificationDropdown>
      <Button
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className={cn("h-10 w-10", hasUnread && "animate-pulse")} />

        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#ec2227]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>
    </NotificationDropdown>
  );
}
