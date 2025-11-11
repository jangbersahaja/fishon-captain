"use client";

interface TypingIndicatorProps {
  senderName: string;
  /**
   * Optional: customize the animation
   */
  showAvatar?: boolean;
}

/**
 * TypingIndicator Component
 *
 * Shows animated typing indicator with dots bouncing
 * Used when other user is composing a message
 */
export function TypingIndicator({
  senderName,
  showAvatar = true,
}: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2 mb-3">
      {showAvatar && (
        <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0" />
      )}
      <div className="flex items-end gap-1">
        <span className="text-sm text-gray-600">{senderName} is typing</span>
        <div className="flex gap-1">
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
}
