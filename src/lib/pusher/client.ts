import PusherClient from "pusher-js";

interface Message {
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

let pusherClientInstance: PusherClient | null = null;

/**
 * Get or initialize Pusher client instance (lazy initialization)
 * Used for real-time subscriptions in the browser
 */
export function getPusherClient(): PusherClient | null {
  // Return existing instance if already initialized
  if (pusherClientInstance) return pusherClientInstance;

  // Check if required environment variables are present
  if (
    !process.env.NEXT_PUBLIC_PUSHER_KEY ||
    !process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  ) {
    // In dev/test environments, return null but don't throw
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[Pusher] Missing NEXT_PUBLIC_PUSHER_KEY or NEXT_PUBLIC_PUSHER_CLUSTER. Real-time disabled."
      );
      return null;
    }

    throw new Error(
      "Missing Pusher environment variables. Please set NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER"
    );
  }

  // Initialize Pusher client
  pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    authEndpoint: "/api/pusher/auth",
    auth: {
      headers: {
        "Content-Type": "application/json",
      },
    },
  });

  // Handle connection errors
  pusherClientInstance.connection.bind("error", (error: unknown) => {
    console.error("[Pusher] Connection error:", error);
  });

  return pusherClientInstance;
}

/**
 * Subscribe to a private conversation channel
 */
export function subscribeToConversation(
  conversationId: string,
  callbacks: {
    onMessageNew?: (message: Message) => void;
    onMessageRead?: (data: { userId: string; readAt: string }) => void;
    onTyping?: (data: { userId: string; isTyping: boolean }) => void;
    onError?: (error: Error) => void;
  }
) {
  const pusher = getPusherClient();

  if (!pusher) {
    console.warn("[Pusher] Client not initialized. Subscriptions disabled.");
    return { unsubscribe: () => {} };
  }

  try {
    const channelName = `private-conversation.${conversationId}`;
    const channel = pusher.subscribe(channelName);

    // Handle subscription errors
    channel.bind("error", (error: unknown) => {
      console.error(`[Pusher] Channel error on ${channelName}:`, error);
      callbacks.onError?.(new Error(`Channel error: ${error}`));
    });

    // Bind event listeners
    if (callbacks.onMessageNew) {
      channel.bind("message.new", callbacks.onMessageNew);
    }

    if (callbacks.onMessageRead) {
      channel.bind("message.read", callbacks.onMessageRead);
    }

    if (callbacks.onTyping) {
      channel.bind("typing", callbacks.onTyping);
    }

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        if (callbacks.onMessageNew) {
          channel.unbind("message.new", callbacks.onMessageNew);
        }
        if (callbacks.onMessageRead) {
          channel.unbind("message.read", callbacks.onMessageRead);
        }
        if (callbacks.onTyping) {
          channel.unbind("typing", callbacks.onTyping);
        }
        pusher.unsubscribe(channelName);
      },
    };
  } catch (error) {
    console.error("[Pusher] Subscription error:", error);
    callbacks.onError?.(
      error instanceof Error ? error : new Error("Subscription failed")
    );
    return { unsubscribe: () => {} };
  }
}

/**
 * Disconnect Pusher client
 */
export function disconnectPusher() {
  if (pusherClientInstance) {
    pusherClientInstance.disconnect();
    pusherClientInstance = null;
  }
}
