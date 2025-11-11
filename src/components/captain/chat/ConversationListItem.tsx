"use client";

import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export interface ConversationListItemProps {
  conversationId: string;
  otherUserName: string;
  charterName: string;
  lastMessagePreview?: string | null;
  lastMessageTime?: string | null;
  unreadCount: number;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * ConversationListItem Component
 *
 * Displays a single conversation in the conversations list
 * Shows charter info, last message preview, and unread badge
 */
export function ConversationListItem({
  conversationId,
  otherUserName,
  charterName,
  lastMessagePreview,
  lastMessageTime,
  unreadCount,
  isSelected = false,
  onSelect,
}: ConversationListItemProps) {
  // Format time relative to now
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleClick = () => {
    onSelect?.(conversationId);
  };

  return (
    <Link href={`/account/messages/${conversationId}`}>
      <div
        onClick={handleClick}
        className={`px-4 py-3 border-b cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-50 border-l-4 border-l-blue-500"
            : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: User and Charter Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {otherUserName}
              </h3>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>

            <p className="text-xs text-gray-500 truncate mb-1">{charterName}</p>

            <p className="text-sm text-gray-600 truncate line-clamp-2">
              {lastMessagePreview || "No messages yet"}
            </p>
          </div>

          {/* Right: Time */}
          <div className="text-xs text-gray-500 flex-shrink-0">
            {formatTime(lastMessageTime)}
          </div>
        </div>
      </div>
    </Link>
  );
}
