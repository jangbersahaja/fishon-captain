"use client";

import { Check, CheckCheck } from "lucide-react";

export interface MessageBubbleProps {
  content: string;
  senderName: string;
  senderType: "angler" | "captain" | "system";
  systemType?: string | null;
  isOwn: boolean;
  status?: "SENT" | "DELIVERED" | "READ";
  createdAt: string;
  /**
   * Optional: show system message styling
   */
  showSystemStyling?: boolean;
}

/**
 * MessageBubble Component
 *
 * Displays a single message in the chat interface
 * Handles different message types and read receipt indicators
 */
export function MessageBubble({
  content,
  senderName,
  senderType,
  systemType,
  isOwn,
  status = "SENT",
  createdAt,
  showSystemStyling = true,
}: MessageBubbleProps) {
  // Format time
  const time = new Date(createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // System message styling
  if (senderType === "system" && showSystemStyling) {
    return (
      <div className="flex justify-center my-4">
        <div className="max-w-xs px-3 py-2 text-sm text-center text-gray-700 bg-gray-100 rounded-lg">
          {content}
          {systemType && (
            <div className="mt-1 text-xs text-gray-600">({systemType})</div>
          )}
        </div>
      </div>
    );
  }

  // User message styling
  return (
    <div
      className={`flex gap-2 mb-3 ${isOwn ? "justify-end" : "justify-start"}`}
    >
      {!isOwn && (
        <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-sm font-semibold text-gray-600 bg-gray-300 rounded-full">
          {senderName[0]?.toUpperCase()}
        </div>
      )}

      <div
        className={`flex flex-col gap-1 max-w-xs ${isOwn ? "items-end" : "items-start"}`}
      >
        {!isOwn && (
          <span className="px-2 text-xs font-semibold text-gray-700">
            {senderName}
          </span>
        )}

        <div
          className={`px-4 py-2 rounded-lg break-words ${
            isOwn
              ? "bg-blue-500 text-white rounded-br-none"
              : "bg-gray-200 text-gray-900 rounded-bl-none"
          }`}
        >
          <p className="text-sm">{content}</p>
        </div>

        <div className="flex items-center gap-1 px-2 text-xs text-gray-500">
          <span>{time}</span>
          {isOwn && (
            <>
              {status === "READ" ? (
                <CheckCheck className="w-3 h-3 text-blue-500" />
              ) : status === "DELIVERED" ? (
                <CheckCheck className="w-3 h-3" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
