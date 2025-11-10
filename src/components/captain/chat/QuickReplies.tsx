"use client";

import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  replies?: string[];
  onReplyClick: (reply: string) => void;
  isLoading?: boolean;
}

const CAPTAIN_QUICK_REPLIES = [
  "Booking approved! Looking forward to hosting you 🎣",
  "All fishing equipment will be provided",
  "Please arrive 15 minutes early at the meeting point",
  "Weather looks good for your trip! ☀️",
  "Thanks for booking! See you soon",
  "Reminder: Trip starts at 6:00 AM. See you at the dock!",
  "Feel free to call me directly if you have questions",
  "I can reschedule if needed. When works better for you?",
];

/**
 * QuickReplies Component (Captain View)
 *
 * Displays captain-specific pre-defined quick reply buttons
 * Helps captains respond faster to common booking-related questions
 * Includes status updates, logistics, and support messages
 */
export function QuickReplies({
  replies = CAPTAIN_QUICK_REPLIES,
  onReplyClick,
  isLoading = false,
}: QuickRepliesProps) {
  return (
    <div className="px-4 py-2 border-t bg-gray-50">
      <p className="text-xs text-gray-600 mb-2">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <Button
            key={reply}
            variant="outline"
            size="sm"
            onClick={() => onReplyClick(reply)}
            disabled={isLoading}
            className="text-xs"
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
}
