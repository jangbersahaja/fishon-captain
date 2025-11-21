/**
 * System Messages Service
 * Generate system messages based on verification status and charter data
 */

import { prisma } from "@/lib/prisma";
import type { CaptainVerification } from "@prisma/client";

/**
 * System message object displayed in the dashboard
 */
export interface SystemMessage {
  id: string;
  type: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  description: string;
  actionUrl?: string;
  cta?: string;
  autoHideSecs?: number;
  isDismissible: boolean;
}

/**
 * Get all dismissed message IDs for a user
 *
 * @param userId - Captain's user ID
 * @returns Set of dismissed message IDs for fast filtering
 */
export async function getDismissedMessages(
  userId: string
): Promise<Set<string>> {
  const dismissals = await prisma.messageDismissal.findMany({
    where: { userId },
    select: { messageId: true },
  });

  return new Set(dismissals.map((d: { messageId: string }) => d.messageId));
}

/**
 * Generate system messages based on verification status
 *
 * Business logic:
 * - Skip all messages if charterCount === 0 (brand new captains)
 * - NO verification record → Show critical message to start verification
 * - Missing government ID (front or back) → RED critical
 * - Missing banking details → AMBER warning
 * - Verification REJECTED → RED critical with reason
 * - Verification PENDING → AMBER warning
 * - Verification APPROVED → Skip (success state, no action needed)
 * - Filter out dismissed messages
 * - Sort by severity (critical first)
 *
 * @param verification - Captain verification record (or null if doesn't exist)
 * @param charterCount - Number of active charters
 * @param userId - Captain's user ID (needed when verification is null)
 * @returns Array of system messages sorted by severity
 */
export async function generateSystemMessages(
  verification: CaptainVerification | null,
  charterCount: number,
  userId: string
): Promise<SystemMessage[]> {
  const messages: SystemMessage[] = [];

  // Skip all messages if no charters yet
  if (charterCount === 0) {
    return [];
  }

  // Get dismissed messages for this user
  const dismissed = await getDismissedMessages(userId);

  // No verification record exists - show message to start verification
  if (!verification) {
    const msgId = "no-verification-record";
    if (!dismissed.has(msgId)) {
      messages.push({
        id: msgId,
        type: "verification",
        severity: "critical",
        title: "Complete Account Verification",
        description:
          "Your account is not verified. Please complete your verification to receive bookings and payouts.",
        actionUrl: "/captain/documents",
        cta: "Start Verification",
        isDismissible: true,
      });
    }
    return messages;
  }

  // Check for missing government ID documents
  if (!verification.idFront || !verification.idBack) {
    const msgId = "missing-id-front-or-back";
    if (!dismissed.has(msgId)) {
      messages.push({
        id: msgId,
        type: "verification",
        severity: "critical",
        title: "Government ID Required",
        description:
          "Please upload both front and back of your government ID to verify your account.",
        actionUrl: "/captain/documents",
        cta: "Upload ID",
        isDismissible: true,
      });
    }
  }

  // Check for missing banking details
  const missingBankDetails =
    !verification.bankAccountHolder ||
    !verification.bankAccountNumber ||
    !verification.bankName;

  if (missingBankDetails) {
    const msgId = "missing-banking-details";
    if (!dismissed.has(msgId)) {
      messages.push({
        id: msgId,
        type: "banking",
        severity: "warning",
        title: "Add Banking Details",
        description:
          "Complete your banking information to receive payouts for bookings.",
        actionUrl: "/captain/documents",
        cta: "Add Banking Info",
        isDismissible: true,
      });
    }
  }

  // Check verification status
  if (verification.status === "REJECTED") {
    const msgId = "verification-rejected";
    if (!dismissed.has(msgId)) {
      const reasonValue =
        verification.bankStatement &&
        typeof verification.bankStatement === "object"
          ? (verification.bankStatement as Record<string, unknown>).reason
          : undefined;
      const reason =
        typeof reasonValue === "string"
          ? reasonValue
          : "Your verification was rejected";

      messages.push({
        id: msgId,
        type: "verification_status",
        severity: "critical",
        title: "Verification Unable to Complete",
        description: reason,
        actionUrl: "/captain/documents",
        cta: "Resubmit",
        isDismissible: true,
      });
    }
  } else if (verification.status === "PENDING") {
    const msgId = "verification-pending";
    if (!dismissed.has(msgId)) {
      messages.push({
        id: msgId,
        type: "verification_status",
        severity: "warning",
        title: "Verification Pending",
        description:
          "Your verification is being reviewed. We'll notify you once it's complete.",
        isDismissible: true,
      });
    }
  }
  // APPROVED status: don't generate message (success state - no action needed)

  // Sort by severity: critical first, then warning, then others
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  messages.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return messages;
}
