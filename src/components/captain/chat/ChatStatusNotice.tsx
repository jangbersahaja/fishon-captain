import { AlertCircle, Lock, XCircle } from "lucide-react";
import Link from "next/link";

interface ChatStatusNoticeProps {
  status: "LOCKED" | "CLOSED" | "RESTRICTED";
  reason?: string;
}

/**
 * Chat Status Notice Component
 *
 * Displays a small, non-intrusive message explaining why chat is disabled
 * with a link to contact support for assistance.
 */
export function ChatStatusNotice({ status, reason }: ChatStatusNoticeProps) {
  const config = {
    LOCKED: {
      icon: Lock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      title: "Chat Locked",
      message: "Chat will be available after payment is confirmed.",
    },
    CLOSED: {
      icon: XCircle,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      title: "Chat Closed",
      message: "This conversation has been closed after trip completion.",
    },
    RESTRICTED: {
      icon: AlertCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      title: "Chat Restricted",
      message: "This conversation is read-only due to booking cancellation.",
    },
  };

  const {
    icon: Icon,
    color,
    bgColor,
    borderColor,
    title,
    message,
  } = config[status];

  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 text-xs border rounded-lg ${bgColor} ${borderColor}`}
    >
      <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${color}`}>{title}</p>
        <p className="text-gray-600 mt-0.5">
          {reason || message}{" "}
          <Link
            href="/support"
            className="underline hover:text-gray-900 transition-colors"
          >
            Contact support
          </Link>{" "}
          if you need assistance.
        </p>
      </div>
    </div>
  );
}
