"use client";

import type { SystemMessage as ISystemMessage } from "@/lib/services/system-messages";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SystemMessageProps {
  message: ISystemMessage;
  expanded?: boolean;
  onDismiss?: (messageId: string) => void;
}

/**
 * Get icon component based on severity
 */
function getSeverityIcon(severity: ISystemMessage["severity"]) {
  const iconProps = "w-5 h-5";

  switch (severity) {
    case "critical":
      return <AlertCircle className={`${iconProps} text-red-600`} />;
    case "warning":
      return <AlertCircle className={`${iconProps} text-amber-600`} />;
    case "success":
      return <CheckCircle className={`${iconProps} text-green-600`} />;
    case "info":
    default:
      return <Info className={`${iconProps} text-blue-600`} />;
  }
}

/**
 * Get color classes based on severity
 */
function getSeverityColors(severity: ISystemMessage["severity"]) {
  switch (severity) {
    case "critical":
      return {
        titleColor: "text-red-800",
        descColor: "text-red-700",
        buttonBg: "bg-red-100",
        buttonText: "text-red-600",
        buttonHover: "hover:bg-red-200",
      };
    case "warning":
      return {
        titleColor: "text-amber-800",
        descColor: "text-amber-700",
        buttonBg: "bg-amber-100",
        buttonText: "text-amber-600",
        buttonHover: "hover:bg-amber-200",
      };
    case "success":
      return {
        titleColor: "text-green-800",
        descColor: "text-green-700",
        buttonBg: "bg-green-100",
        buttonText: "text-green-600",
        buttonHover: "hover:bg-green-200",
      };
    case "info":
    default:
      return {
        titleColor: "text-blue-800",
        descColor: "text-blue-700",
        buttonBg: "bg-blue-100",
        buttonText: "text-blue-600",
        buttonHover: "hover:bg-blue-200",
      };
  }
}

/**
 * SystemMessage Component
 *
 * Displays an individual system message with severity-based styling,
 * auto-hide functionality, and optional action button/dismiss button.
 *
 * @param message - The system message to display
 * @param expanded - Whether this message is shown in expanded view (for layout purposes)
 * @param onDismiss - Optional callback when dismiss button clicked
 */
export function SystemMessage({
  message,
  expanded: _expanded = true,
  onDismiss,
}: SystemMessageProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isHiding, setIsHiding] = useState(false);
  const colors = getSeverityColors(message.severity);
  const icon = getSeverityIcon(message.severity);

  // Auto-hide functionality
  useEffect(() => {
    if (!message.autoHideSecs) {
      return;
    }

    const timer = setTimeout(() => {
      setIsHiding(true);
      setTimeout(() => {
        setIsVisible(false);
        onDismiss?.(message.id);
      }, 150); // Wait for animation
    }, message.autoHideSecs * 1000);

    return () => clearTimeout(timer);
  }, [message.autoHideSecs, message.id, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const handleDismiss = async () => {
    setIsHiding(true);
    setTimeout(() => {
      setIsVisible(false);

      // Call dismiss API
      if (message.isDismissible) {
        fetch("/api/captain/messages/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: message.id }),
        }).catch((err) => {
          console.error("Failed to dismiss message:", err);
        });
      }

      onDismiss?.(message.id);
    }, 150); // Wait for animation
  };

  return (
    <div
      className={`transition-all duration-150 ${isHiding ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
      role="alert"
    >
      <div className="flex gap-3 p-4">
        {/* Icon */}
        <div className="flex-shrink-0 pt-0.5">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${colors.titleColor}`}>
            {message.title}
          </h3>
          <p className={`text-sm mt-1 ${colors.descColor}`}>
            {message.description}
          </p>

          {/* Action button and dismiss button */}
          {(message.actionUrl || message.isDismissible) && (
            <div className="flex items-center gap-2 mt-3">
              {message.actionUrl && message.cta && (
                <Link
                  href={message.actionUrl}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md ${colors.buttonBg} ${colors.buttonText} ${colors.buttonHover} transition-colors`}
                >
                  {message.cta}
                  <span>→</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {message.isDismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-300 rounded p-1"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
