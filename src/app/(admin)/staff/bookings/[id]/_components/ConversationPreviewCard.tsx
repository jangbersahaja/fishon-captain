import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prismaMarket } from "@/lib/prisma-market";
import { ExternalLink, MessageCircle, MessageSquare, User } from "lucide-react";

interface ConversationPreviewCardProps {
  bookingId: string;
}

type Message = {
  id: string;
  senderType: string;
  senderName: string;
  content: string;
  contentType: string;
  systemType: string | null;
  createdAt: Date;
};

type Conversation = {
  id: string;
  status: string;
  lastMessageAt: Date | null;
  lastMessagePreview: string | null;
  anglerUnreadCount: number;
  captainUnreadCount: number;
  messages: Message[];
};

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-MY", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case "LOCKED":
      return (
        <Badge variant="secondary" className="text-xs">
          Locked
        </Badge>
      );
    case "ACTIVE":
      return (
        <Badge variant="default" className="text-xs bg-green-600">
          Active
        </Badge>
      );
    case "CLOSED":
      return (
        <Badge variant="outline" className="text-xs">
          Closed
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
}

function getSenderIcon(senderType: string) {
  switch (senderType) {
    case "angler":
      return <User className="w-3 h-3 text-blue-600" />;
    case "captain":
      return <User className="w-3 h-3 text-green-600" />;
    case "system":
      return <MessageSquare className="w-3 h-3 text-slate-400" />;
    default:
      return <User className="w-3 h-3 text-slate-400" />;
  }
}

export async function ConversationPreviewCard({
  bookingId,
}: ConversationPreviewCardProps) {
  let conversation: Conversation | null = null;

  try {
    conversation = await prismaMarket.conversation.findUnique({
      where: { bookingId },
      select: {
        id: true,
        status: true,
        lastMessageAt: true,
        lastMessagePreview: true,
        anglerUnreadCount: true,
        captainUnreadCount: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            senderType: true,
            senderName: true,
            content: true,
            contentType: true,
            systemType: true,
            createdAt: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[ConversationPreviewCard] Error:", error);
  }

  if (!conversation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 text-center py-4">
            No conversation started
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalUnread =
    conversation.anglerUnreadCount + conversation.captainUnreadCount;
  const reversedMessages = [...conversation.messages].reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Conversation
          {getStatusBadge(conversation.status)}
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-xs ml-auto">
              {totalUnread} unread
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message Preview */}
        {reversedMessages.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reversedMessages.map((message) => (
              <div
                key={message.id}
                className={`p-2 rounded-lg text-sm ${
                  message.senderType === "system"
                    ? "bg-slate-100 text-center"
                    : message.senderType === "captain"
                      ? "bg-green-50 ml-4"
                      : "bg-blue-50 mr-4"
                }`}
              >
                {message.senderType !== "system" && (
                  <div className="flex items-center gap-1 mb-1">
                    {getSenderIcon(message.senderType)}
                    <span className="text-xs font-medium text-slate-600">
                      {message.senderName}
                    </span>
                  </div>
                )}
                <p
                  className={`${message.senderType === "system" ? "text-xs text-slate-500 italic" : "text-slate-700"}`}
                >
                  {message.contentType === "system" && message.systemType
                    ? formatSystemMessage(message.systemType)
                    : truncateMessage(message.content, 100)}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(message.createdAt)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 text-center py-2">
            No messages yet
          </p>
        )}

        {/* Stats */}
        <div className="flex justify-between text-xs text-slate-500 pt-2 border-t">
          <span>{conversation.messages.length} messages shown</span>
          {conversation.lastMessageAt && (
            <span>Last: {formatDateTime(conversation.lastMessageAt)}</span>
          )}
        </div>

        {/* Link to full conversation (if available in fishon-market) */}
        <div className="pt-2">
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Full conversation available in fishon-market admin
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function truncateMessage(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}

function formatSystemMessage(systemType: string): string {
  const systemMessages: Record<string, string> = {
    booking_created: "Booking request created",
    booking_approved: "Booking approved by captain",
    booking_rejected: "Booking rejected",
    payment_confirmed: "Payment confirmed",
    booking_cancelled: "Booking cancelled",
    trip_completed: "Trip completed",
    conversation_unlocked: "Chat unlocked",
    conversation_closed: "Chat closed",
  };
  return systemMessages[systemType] || systemType.replace(/_/g, " ");
}
