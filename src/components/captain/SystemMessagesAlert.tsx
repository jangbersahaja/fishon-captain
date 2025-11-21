"use client";

import type { SystemMessage as ISystemMessage } from "@/lib/services/system-messages";
import { AlertCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { SystemMessage } from "./SystemMessage";

interface SystemMessagesAlertProps {
  messages: ISystemMessage[];
  onDismiss?: (messageId: string) => void;
}

/**
 * Map severity to border and background colors
 */
function getSeverityStyles(severity: ISystemMessage["severity"]) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50";
    case "warning":
      return "border-amber-200 bg-amber-50";
    case "success":
      return "border-green-200 bg-green-50";
    case "info":
    default:
      return "border-blue-200 bg-blue-50";
  }
}

/**
 * Get icon color based on severity
 */
function getSeverityIconColor(severity: ISystemMessage["severity"]) {
  switch (severity) {
    case "critical":
      return "text-red-600";
    case "warning":
      return "text-amber-600";
    case "success":
      return "text-green-600";
    case "info":
    default:
      return "text-blue-600";
  }
}

/**
 * SystemMessagesAlert Component
 *
 * Collapsible container for displaying system messages.
 * - Shows first/highest priority message expanded by default
 * - Shows remaining messages collapsed with count badge
 * - Smooth animations for expand/collapse
 * - Severity-based styling
 *
 * @param messages - Array of system messages to display
 * @param onDismiss - Optional callback when message dismissed
 */
export function SystemMessagesAlert({
  messages,
  onDismiss,
}: SystemMessagesAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleMessages, setVisibleMessages] = useState(
    messages.map((m) => m.id)
  );

  // Filter out dismissed messages
  const activeMessages = messages.filter((m) => visibleMessages.includes(m.id));

  // Empty state: render nothing if no messages
  if (activeMessages.length === 0) {
    return null;
  }

  // Split into first message and rest
  const firstMessage = activeMessages[0];
  const restMessages = activeMessages.slice(1);
  const severityStyles = getSeverityStyles(firstMessage.severity);
  const iconColor = getSeverityIconColor(firstMessage.severity);

  const handleDismiss = (messageId: string) => {
    setVisibleMessages((prev) => prev.filter((id) => id !== messageId));
    onDismiss?.(messageId);
  };

  return (
    <div
      className={`border rounded-2xl shadow-sm transition-all duration-200 ${severityStyles}`}
    >
      {/* Header / First Message */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <AlertCircle
            className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`}
          />
          <div className="flex-1 min-w-0">
            <SystemMessage
              message={firstMessage}
              expanded={true}
              onDismiss={handleDismiss}
            />
          </div>
        </div>
      </div>

      {/* Collapsed messages section */}
      {restMessages.length > 0 && (
        <>
          {/* Toggle button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full px-4 py-3 flex items-center justify-between border-t ${severityStyles} transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-current`}
          >
            <span className="text-sm font-semibold text-slate-700">
              +{restMessages.length} more alert
              {restMessages.length !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${
                isExpanded ? "transform rotate-180" : ""
              }`}
            />
          </button>

          {/* Collapsed content - smooth slide animation */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              isExpanded ? "max-h-96" : "max-h-0"
            }`}
          >
            <div className="p-4 space-y-4 border-t">
              {restMessages.map((msg, idx) => (
                <div key={msg.id} className={idx > 0 ? "pt-4 border-t" : ""}>
                  <div className="flex gap-3">
                    <AlertCircle
                      className={`w-5 h-5 ${getSeverityIconColor(msg.severity)} flex-shrink-0 mt-0.5`}
                    />
                    <div className="flex-1 min-w-0">
                      <SystemMessage
                        message={msg}
                        expanded={true}
                        onDismiss={handleDismiss}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
