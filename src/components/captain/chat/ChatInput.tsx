"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import React, { useEffect, useState } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  isDisabled?: boolean;
  isLocked?: boolean;
  placeholder?: string;
}

const MAX_MESSAGE_LENGTH = 1000;
const TYPING_DEBOUNCE_MS = 500;

/**
 * ChatInput Component
 *
 * Input field for composing messages with character counter
 * Handles typing indicators with debounce
 * Shows locked state when conversation status is LOCKED
 */
export function ChatInput({
  onSendMessage,
  onTyping,
  isDisabled = false,
  isLocked = false,
  placeholder = "Type your message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Limit to max length
    if (value.length > MAX_MESSAGE_LENGTH) {
      setMessage(value.slice(0, MAX_MESSAGE_LENGTH));
      return;
    }

    setMessage(value);

    // Send typing indicator
    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      onTyping?.(true);
    }

    // Debounce typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTyping?.(false);
    }, TYPING_DEBOUNCE_MS);
  };

  // Handle sending message
  const handleSend = async () => {
    if (!message.trim() || isSending || isDisabled || isLocked) {
      return;
    }

    setIsSending(true);

    try {
      // Clear typing indicator
      setIsTyping(false);
      onTyping?.(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send message
      await onSendMessage(message.trim());

      // Clear input
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      // TODO: Show error toast
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Show locked state
  if (isLocked) {
    return (
      <div className="px-4 py-2 bg-gray-100 text-center">
        <p className="text-sm text-gray-600">🔒 {placeholder}</p>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* Input area - More compact */}
      <div className="px-4 py-2 flex gap-2 items-center">
        <Input
          value={message}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className="flex-1"
        />

        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || isDisabled}
          className="flex-shrink-0"
          size="icon"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      {/* Character counter - Show only when approaching limit */}
      {message.length > MAX_MESSAGE_LENGTH * 0.8 && (
        <div className="px-4 pb-2 text-right">
          <span
            className={`text-xs ${
              message.length > MAX_MESSAGE_LENGTH * 0.9
                ? "text-red-500"
                : "text-gray-400"
            }`}
          >
            {message.length} / {MAX_MESSAGE_LENGTH}
          </span>
        </div>
      )}
    </div>
  );
}
