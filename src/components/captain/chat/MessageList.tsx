"use client";

import { type Message } from "@/hooks/useConversation";
import React, { useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface MessageListProps {
  messages: Message[];
  typingUsers: string[];
  currentUserId: string;
  isLoading?: boolean;
  onEndReached?: () => void;
}

/**
 * MessageList Component
 *
 * Scrollable list of messages in the conversation
 * Auto-scrolls to bottom on new messages
 * Shows typing indicators for users currently typing
 */
export function MessageList({
  messages,
  typingUsers,
  currentUserId,
  isLoading = false,
  onEndReached,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  // Handle scroll to load more (if needed)
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    if (element.scrollTop === 0) {
      onEndReached?.();
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  if (messages.length === 0 && typingUsers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No messages yet</p>
          <p className="text-sm">Start the conversation by typing below</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-2"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          senderName={message.senderName}
          senderType={message.senderType as "angler" | "captain" | "system"}
          systemType={message.systemType}
          isOwn={message.senderId === currentUserId}
          status={message.status}
          createdAt={message.createdAt}
        />
      ))}

      {/* Typing indicators */}
      {typingUsers.map((userId) => (
        <TypingIndicator
          key={`typing-${userId}`}
          senderName="User"
          showAvatar={true}
        />
      ))}

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
