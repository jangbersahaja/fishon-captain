"use client";

import { BookingStatusBadge } from "@/components/captain/BookingStatusBadge";
import type { Message } from "@/hooks/useConversation";
import { getPusherClient } from "@/lib/pusher/client";
import { MessageCircle, MessageSquare, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatDetail } from "./[id]/chat-detail";

type SerializedConversation = {
  id: string;
  anglerName: string;
  anglerAvatar: string | null;
  status: string;
  captainUnreadCount: number;
  booking: {
    id: string;
    status: string;
  } | null;
  messages: Array<{
    id: string;
    content: string;
    createdAt: string;
    senderType: string;
  }>;
};

type ConversationData = {
  id: string;
  anglerId: string;
  charterId: string;
  ownerId: string;
  status: string;
  angler: {
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
  };
  booking: {
    id: string;
    status: string;
    charterName: string;
    note?: string;
    date: string;
    days: number;
    adults: number;
    children: number;
    totalPrice: number;
    startTime?: string;
  } | null;
  messages: Message[];
};

type Props = {
  conversations: SerializedConversation[];
  selectedId?: string;
  selectedConversation: ConversationData | null;
  userId: string;
};

export default function ConversationsClient({
  conversations,
  selectedId,
  selectedConversation,
  userId,
}: Props) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [localConversations, setLocalConversations] =
    useState<SerializedConversation[]>(conversations);

  // Update local state when server data changes
  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  // Subscribe to conversation metadata updates
  useEffect(() => {
    const pusher = getPusherClient();

    // If Pusher is not configured, skip real-time updates
    if (!pusher) {
      console.warn(
        "[ConversationsClient] Pusher not configured, skipping real-time updates"
      );
      return;
    }

    const channelName = `private-user.${userId}`;
    const channel = pusher.subscribe(channelName);

    // Wait for subscription to succeed before binding events
    channel.bind("pusher:subscription_succeeded", () => {
      console.log("[Pusher] Successfully subscribed to", channelName);
    });

    channel.bind("pusher:subscription_error", (error: unknown) => {
      console.error("[Pusher] Subscription error:", error);
    });

    channel.bind(
      "conversation.updated",
      (data: {
        conversationId: string;
        lastMessageAt: string;
        lastMessagePreview: string;
        captainUnreadCount: number;
      }) => {
        console.log(
          "[ConversationsClient] Conversation updated:",
          data.conversationId
        );

        setLocalConversations((prev) => {
          // Find and update the conversation
          const updated = prev.map((conv) =>
            conv.id === data.conversationId
              ? {
                  ...conv,
                  captainUnreadCount: data.captainUnreadCount,
                  messages:
                    conv.messages.length > 0
                      ? [
                          {
                            ...conv.messages[0],
                            content: data.lastMessagePreview,
                            createdAt: data.lastMessageAt,
                          },
                        ]
                      : conv.messages,
                }
              : conv
          );

          // Sort by lastMessageAt (most recent first)
          return updated.sort((a, b) => {
            const aTime = a.messages[0]?.createdAt || new Date(0).toISOString();
            const bTime = b.messages[0]?.createdAt || new Date(0).toISOString();
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });
        });
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user.${userId}`);
    };
  }, [userId]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConversationClick = (id: string) => {
    if (isMobile) {
      // Mobile: navigate to dedicated page
      router.push(`/captain/messages/${id}`);
    } else {
      // Desktop: update URL with selected param
      router.push(`/captain/messages?selected=${id}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations list */}
        <div className="w-full overflow-y-auto bg-white border-r sm:w-96">
          <div className="px-6 py-4 bg-white border-b">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
              <MessageCircle className="w-6 h-6" />
              Messages
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Chat with anglers about their bookings
            </p>
          </div>
          {localConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
              <h2 className="mb-2 font-semibold text-gray-900">
                No messages yet
              </h2>
              <p className="text-sm text-gray-600">
                Messages will appear here once anglers book and pay for your
                charters
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {localConversations.map((conversation) => {
                const lastMessage = conversation.messages[0];
                const bookingStatus = conversation.booking?.status;
                const isSelected = conversation.id === selectedId;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation.id)}
                    className={`block w-full text-left px-4 py-3 hover:bg-gray-50 transition cursor-pointer border-l-4 ${
                      isSelected
                        ? "border-l-blue-500 bg-blue-50"
                        : "border-l-transparent hover:border-l-blue-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      {conversation.anglerAvatar && (
                        <Image
                          src={conversation.anglerAvatar}
                          alt={`${conversation.anglerName}'s avatar`}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Angler name and status */}
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">
                            {conversation.anglerName}
                          </p>
                          {bookingStatus && (
                            <BookingStatusBadge
                              status={bookingStatus}
                              size="sm"
                            />
                          )}
                        </div>
                        {/* Last message preview */}
                        {lastMessage && (
                          <p className="flex items-center gap-1 mt-1 text-xs text-gray-600 truncate">
                            {lastMessage.senderType === "system" ? (
                              <>
                                <MessageSquare className="flex-shrink-0 w-3 h-3" />
                                {lastMessage.content.substring(0, 50)}
                              </>
                            ) : lastMessage.senderType === "angler" ? (
                              <>
                                <User className="flex-shrink-0 w-3 h-3" />
                                {lastMessage.content.substring(0, 50)}
                              </>
                            ) : (
                              <>
                                <User className="flex-shrink-0 w-3 h-3" />
                                {lastMessage.content.substring(0, 50)}
                              </>
                            )}
                          </p>
                        )}
                        {/* Unread count */}
                        {conversation.captainUnreadCount > 0 && (
                          <div className="mt-1">
                            <span className="inline-block text-xs font-semibold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                              {conversation.captainUnreadCount} new
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      {lastMessage && (
                        <time className="flex-shrink-0 text-xs text-gray-500">
                          {new Date(lastMessage.createdAt).toLocaleDateString("en-MY", {
                            timeZone: "Asia/Kuala_Lumpur",
                          })}
                        </time>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat area (desktop) */}
        <div className="flex-1 hidden overflow-hidden sm:flex bg-gray-50">
          {selectedId && selectedConversation ? (
            <ChatDetail
              key={selectedId}
              conversationId={selectedId}
              initialConversation={selectedConversation}
              userId={userId}
              showBackButton={false}
            />
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
