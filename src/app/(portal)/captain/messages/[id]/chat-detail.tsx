"use client";

import { approveBooking, rejectBooking } from "@/app/actions/booking-actions";
import {
  ChatHeader,
  ChatInput,
  ChatStatusNotice,
  MessageList,
} from "@/components/captain/chat";
import type { Message as HookMessage } from "@/hooks/useConversation";
import { useConversation } from "@/hooks/useConversation";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

interface ConversationData {
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
  messages: HookMessage[];
}

type Props = {
  conversationId: string;
  initialConversation: ConversationData;
  userId: string;
  showBackButton?: boolean;
};

export function ChatDetail({
  conversationId,
  initialConversation,
  userId,
  showBackButton = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminUserId = searchParams?.get("adminUserId") || null;

  const [conversation, setConversation] =
    useState<ConversationData>(initialConversation);

  // Initialize hook with userId (passed to it for permission checks)
  const {
    messages: liveMessages,
    typingUsers,
    isConnected,
    sendMessage,
  } = useConversation(conversationId, userId);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !userId) return;
      await sendMessage(content);
    },
    [sendMessage, userId]
  );

  // Quick reply handler (unused but kept for future functionality)
  const _handleQuickReply = useCallback(
    async (reply: string) => {
      if (!userId) return;
      await sendMessage(reply);
    },
    [sendMessage, userId]
  );

  // Determine if chat should be locked based on booking status
  // Chat is UNLOCKED when booking is PAID or COMPLETED
  // Chat is LOCKED for PENDING, APPROVED, or REJECTED bookings
  const isChatLocked =
    conversation.status === "CLOSED" ||
    (conversation.booking?.status !== "PAID" &&
      conversation.booking?.status !== "COMPLETED");

  // Debug logging
  if (process.env.NODE_ENV === "development") {
    console.log("[ChatDetail] Lock State:", {
      conversationStatus: conversation.status,
      bookingStatus: conversation.booking?.status,
      isChatLocked,
    });
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-white">
      {/* Chat Header with integrated booking details - Fixed on mobile */}
      <div className="sticky top-0 z-10 bg-white">
        <ChatHeader
          anglerName={conversation.angler.name}
          charterName={conversation.booking?.charterName || "Charter"}
          anglerAvatar={conversation.angler.avatar || ""}
          isOnline={isConnected}
          onBack={
            showBackButton
              ? () =>
                  router.push(
                    `/captain/messages${adminUserId ? `?adminUserId=${adminUserId}` : ""}`
                  )
              : undefined
          }
          booking={
            conversation.booking
              ? {
                  id: conversation.booking.id,
                  charterName: conversation.booking.charterName,
                  date: conversation.booking.date,
                  days: conversation.booking.days,
                  adults: conversation.booking.adults,
                  children: conversation.booking.children,
                  totalPrice: conversation.booking.totalPrice,
                  status: conversation.booking.status,
                  note: conversation.booking.note,
                  startTime: conversation.booking.startTime,
                }
              : undefined
          }
          anglerContact={{
            name: conversation.angler.name,
            email: conversation.angler.email,
            phone: conversation.angler.phone,
          }}
          onCall={() => {
            if (conversation.angler.phone) {
              window.location.href = `tel:${conversation.angler.phone}`;
            }
          }}
          onEmail={() => {
            if (conversation.angler.email) {
              window.location.href = `mailto:${conversation.angler.email}`;
            }
          }}
          onApprove={async (bookingId: string) => {
            const result = await approveBooking(bookingId);
            if (result.success && conversation.booking) {
              // Update conversation state optimistically
              setConversation({
                ...conversation,
                booking: {
                  ...conversation.booking,
                  status: "APPROVED",
                },
              });
            }
          }}
          onReject={async (bookingId: string, reason: string) => {
            const result = await rejectBooking(bookingId, reason);
            if (result.success && conversation.booking) {
              // Update conversation state optimistically
              setConversation({
                ...conversation,
                booking: {
                  ...conversation.booking,
                  status: "REJECTED",
                },
              });
            }
          }}
        />
      </div>

      {/* Messages list - Scrollable area */}
      <div className="flex-1 h-full overflow-y-auto">
        <MessageList
          messages={liveMessages}
          typingUsers={typingUsers}
          currentUserId={userId}
        />
      </div>

      {/* Quick replies - Hidden for now */}
      {/* {!isChatLocked && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <QuickReplies
            replies={[
              "Booking approved! Looking forward to hosting you 🎣",
              "All fishing equipment will be provided",
              "Please arrive 15 minutes early at the meeting point",
              "Weather looks good for your trip! ☀️",
              "Feel free to call me directly if you have questions",
            ]}
            onReplyClick={handleQuickReply}
            isLoading={!isConnected}
          />
        </div>
      )} */}

      {/* Chat status notice - Show when locked */}
      {isChatLocked ? (
        <div className="fixed left-0 right-0 px-4 py-3 border-t bottom-15 bg-gray-50 md:relative md:bottom-auto md:left-auto md:right-auto">
          <ChatStatusNotice
            status={
              conversation.status === "CLOSED"
                ? "CLOSED"
                : conversation.booking?.status === "CANCELLED" ||
                    conversation.booking?.status === "REJECTED"
                  ? "RESTRICTED"
                  : "LOCKED"
            }
            reason={
              conversation.booking?.status === "PENDING"
                ? "Chat will unlock when you approve the booking and angler completes payment."
                : conversation.booking?.status === "AWAITING_PAYMENT"
                  ? "Chat will unlock when the angler completes payment."
                  : undefined
            }
          />
        </div>
      ) : (
        <div className="fixed left-0 right-0 px-4 py-3 bg-white border-t bottom-15 md:relative md:bottom-auto md:left-auto md:right-auto">
          <ChatInput
            onSendMessage={handleSendMessage}
            isDisabled={!isConnected}
          />
        </div>
      )}

      {/* Chat input - Fixed at bottom */}

      {/* Connection status indicator - Fixed at bottom */}
      {!isConnected && (
        <div className="flex-shrink-0 px-4 py-2 text-sm text-red-700 border-t border-red-200 bg-red-50">
          Reconnecting...
        </div>
      )}
    </div>
  );
}
