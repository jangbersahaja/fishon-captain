"use client";

import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

interface BookingTimelineProps {
  status: string;
  createdAt: Date;
  updatedAt?: Date | null;
  tripDate: Date;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
}

interface TimelineStep {
  label: string;
  completed: boolean;
  current: boolean;
  timestamp?: Date;
}

export function BookingTimeline({
  status,
  createdAt,
  updatedAt,
  tripDate,
  rejectionReason,
  cancellationReason,
}: BookingTimelineProps) {
  const now = new Date();
  const isTripCompleted = tripDate.getTime() < now.getTime();

  // Define the booking journey steps based on flow type
  // PAYMENT_AUTHORIZED = Auto flow (payment received, awaiting acknowledgment)
  // PENDING → AWAITING_PAYMENT → PAID = Manual flow (approve first, pay later)
  const isAutoFlow = status === "PAYMENT_AUTHORIZED";

  const steps: TimelineStep[] = isAutoFlow
    ? [
        {
          label: "Requested",
          completed: true,
          current: false,
          timestamp: createdAt,
        },
        {
          label: "Payment Received",
          completed: true,
          current: true,
          timestamp: updatedAt || createdAt,
        },
        {
          label: "Confirmed",
          completed: false,
          current: false,
          timestamp: undefined,
        },
        {
          label: "Trip",
          completed: false,
          current: false,
          timestamp: undefined,
        },
      ]
    : [
        {
          label: "Requested",
          completed: true,
          current: status === "PENDING",
          timestamp: createdAt,
        },
        {
          label: "Approved",
          completed: ["AWAITING_PAYMENT", "PAID", "COMPLETED"].includes(status),
          current: status === "AWAITING_PAYMENT",
          timestamp:
            status === "AWAITING_PAYMENT" ||
            status === "PAID" ||
            status === "COMPLETED"
              ? updatedAt || undefined
              : undefined,
        },
        {
          label: "Paid",
          completed: ["PAID", "COMPLETED"].includes(status),
          current: status === "PAID" && !isTripCompleted,
          timestamp: status === "PAID" ? updatedAt || undefined : undefined,
        },
        {
          label: "Trip",
          completed:
            status === "COMPLETED" || (status === "PAID" && isTripCompleted),
          current: status === "PAID" && isTripCompleted,
          timestamp: isTripCompleted ? tripDate : undefined,
        },
      ];

  // Handle rejected/cancelled states
  if (status === "REJECTED" || status === "CANCELLED") {
    const isRejected = status === "REJECTED";
    const reason = isRejected ? rejectionReason : cancellationReason;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isRejected ? "bg-red-500" : "bg-gray-400"
            )}
          />
          <span className="font-medium text-slate-700">
            {isRejected ? "Request Declined" : "Booking Cancelled"}
          </span>
          {updatedAt && (
            <span className="text-slate-400">
              • {formatTimestamp(updatedAt)}
            </span>
          )}
        </div>

        {reason && (
          <div
            className={cn(
              "p-3 rounded-lg border text-sm",
              isRejected
                ? "bg-red-50 border-red-100 text-red-800"
                : "bg-gray-50 border-gray-200 text-gray-700"
            )}
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
              {isRejected ? "Rejection Reason" : "Cancellation Reason"}
            </div>
            <div>{reason}</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Timeline bar */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center flex-1">
            {/* Circle/Check icon */}
            <div
              className={cn(
                "relative flex-shrink-0 rounded-full transition-colors",
                step.completed
                  ? "bg-green-500 text-white"
                  : step.current
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-400"
              )}
            >
              {step.completed ? (
                <Check className="h-5 w-5 p-0.5" />
              ) : (
                <Circle className="h-5 w-5 p-1" fill="currentColor" />
              )}
            </div>

            {/* Connecting line (except for last step) */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 transition-colors",
                  step.completed ? "bg-green-500" : "bg-slate-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Labels */}
      <div className="flex items-start">
        {steps.map((step) => (
          <div
            key={step.label}
            className="flex-1 text-center text-xs first:text-left last:text-right"
          >
            <div
              className={cn(
                "font-medium",
                step.completed
                  ? "text-slate-700"
                  : step.current
                    ? "text-blue-600"
                    : "text-slate-400"
              )}
            >
              {step.label}
            </div>
            {step.timestamp && (
              <div className="text-slate-400 mt-0.5">
                {formatTimestamp(step.timestamp)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return "Yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}
