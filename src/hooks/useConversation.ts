import { subscribeToConversation } from "@/lib/pusher/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Message {
  id: string;
  senderId: string;
  senderType: string;
  senderName: string;
  content: string;
  contentType: string;
  systemType?: string | null;
  createdAt: string;
  status: "SENT" | "DELIVERED" | "READ";
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  bookingId: string;
  anglerId: string;
  ownerId: string;
  charterId: string;
  status: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  anglerUnreadCount: number;
  captainUnreadCount: number;
  createdAt: string;
}

/**
 * useConversation Hook
 *
 * Manages real-time conversation data with Pusher subscriptions.
 * Handles message sync, read receipts, and typing indicators.
 *
 * @param conversationId - ID of the conversation to manage
 * @param userId - Current user ID (for permission checks)
 * @returns Object with messages, conversation data, and control functions
 */
export function useConversation(conversationId: string, userId: string) {
  // Message state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Conversation state
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  // Real-time state
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(true);

  // Refs for managing subscriptions
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Router for revalidation
  const router = useRouter();

  // ============================================================================
  // FETCH INITIAL DATA
  // ============================================================================

  /**
   * Fetch initial messages for the conversation
   */
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true);
      setMessagesError(null);

      const response = await fetch(
        `/api/captain/conversations/${conversationId}/messages?limit=50`
      );

      // Handle 404 - conversation doesn't exist yet
      if (response.status === 404) {
        setMessages([]);
        setMessagesError(
          "Conversation not found. Please check if you have access to this conversation."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("[useConversation] Error fetching messages:", error);
      setMessagesError(
        error instanceof Error ? error.message : "Failed to load messages"
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  /**
   * Fetch conversation details
   */
  const fetchConversation = useCallback(async () => {
    try {
      setIsLoadingConversation(true);

      const response = await fetch(
        `/api/captain/conversations/${conversationId}`
      );

      // Handle 404 - conversation doesn't exist yet
      if (response.status === 404) {
        console.warn(
          "[useConversation] Conversation not found:",
          conversationId
        );
        setConversation(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const data = await response.json();
      setConversation(data);
    } catch (error) {
      console.error("[useConversation] Error fetching conversation:", error);
      setConversation(null);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [conversationId]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  /**
   * Send a message in the conversation
   */
  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        isQuickReply?: boolean;
      }
    ) => {
      try {
        const response = await fetch(
          `/api/captain/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              contentType: "text",
              isQuickReply: options?.isQuickReply || false,
            }),
          }
        );

        // Handle 404 - conversation doesn't exist
        if (response.status === 404) {
          throw new Error(
            "This conversation is not available. Please check if the booking exists."
          );
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to send message: ${response.statusText}`
          );
        }

        const message = await response.json();

        // Optimistically add message to local state
        // (Real-time update will be handled by Pusher)
        return message;
      } catch (error) {
        console.error("[useConversation] Error sending message:", error);
        throw error;
      }
    },
    [conversationId]
  );

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  /**
   * Mark all messages in conversation as read
   */
  const markAsRead = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/captain/conversations/${conversationId}/read`,
        { method: "PATCH" }
      );

      if (!response.ok) {
        console.error(
          "[useConversation] Failed to mark as read:",
          response.statusText
        );
        return;
      }

      console.log("[useConversation] Marked conversation as read");

      // Trigger router refresh to update unread counts in sidebar
      router.refresh();
    } catch (error) {
      console.error("[useConversation] Error marking as read:", error);
    }
  }, [conversationId, router]);

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(async (_isTyping: boolean) => {
    // Typing indicator sending not implemented in captain API; no-op to avoid errors.
    return;
  }, []);

  // ============================================================================
  // REAL-TIME EVENTS
  // ============================================================================

  /**
   * Handle incoming message
   */
  const handleMessageNew = useCallback(
    (message: Message) => {
      console.log("[useConversation] New message received:", message.id);
      setMessages((prev) => [...prev, message]);

      // Debounced router refresh to revalidate Server Component data
      // This ensures conversation list, unread counts, etc. stay fresh
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh();
      }, 500);
    },
    [router]
  );

  /**
   * Handle read receipt
   */
  const handleMessageRead = useCallback(
    (data: { userId: string; readAt: string }) => {
      console.log("[useConversation] Read receipt from:", data.userId);
      // Update message statuses for this user
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId !== data.userId
            ? msg
            : { ...msg, status: "READ", readAt: data.readAt }
        )
      );
    },
    []
  );

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      // Don't show typing for current user
      if (data.userId === userId) {
        return;
      }

      console.log(
        `[useConversation] Typing indicator from ${data.userId}: ${data.isTyping}`
      );

      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (data.isTyping) {
        // User started typing
        setTypingUsers((prev) => new Map(prev).set(data.userId, true));

        // Auto-clear typing indicator after 3 seconds of no update
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
          typingTimeoutRef.current.delete(data.userId);
        }, 3000);

        typingTimeoutRef.current.set(data.userId, timeout);
      } else {
        // User stopped typing
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        typingTimeoutRef.current.delete(data.userId);
      }
    },
    [userId]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Initialize: fetch data and subscribe to real-time events
   */
  useEffect(() => {
    // Fetch initial data
    fetchMessages();
    // Note: fetchConversation() removed - conversation data now passed as prop to components
    markAsRead();

    // Subscribe to real-time events
    subscriptionRef.current = subscribeToConversation(conversationId, {
      onMessageNew: handleMessageNew,
      onMessageRead: handleMessageRead,
      onTyping: handleTyping,
      onError: (error) => {
        console.error("[useConversation] Subscription error:", error);
        setIsConnected(false);
      },
    });

    // Store ref values for cleanup
    const currentSubscription = subscriptionRef.current;
    const currentTypingTimeouts = typingTimeoutRef.current;
    const currentRefreshTimeout = refreshTimeoutRef.current;

    return () => {
      // Cleanup subscriptions
      currentSubscription?.unsubscribe();

      // Clear typing timeouts
      currentTypingTimeouts.forEach((timeout) => clearTimeout(timeout));
      currentTypingTimeouts.clear();

      // Clear refresh timeout
      if (currentRefreshTimeout) {
        clearTimeout(currentRefreshTimeout);
      }
    };
  }, [
    conversationId,
    fetchMessages,
    markAsRead,
    handleMessageNew,
    handleMessageRead,
    handleTyping,
  ]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Message data
    messages,
    isLoadingMessages,
    messagesError,

    // Conversation data
    conversation,
    isLoadingConversation,

    // Real-time state
    typingUsers: Array.from(typingUsers.keys()),
    isConnected,

    // Actions
    sendMessage,
    markAsRead,
    sendTypingIndicator,

    // Refresh functions
    refetch: () => {
      fetchMessages();
      // Note: fetchConversation() removed - conversation data managed by parent component
    },
  };
}
