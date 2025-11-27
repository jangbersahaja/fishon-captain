/**
 * Staff Booking Admin Actions
 *
 * Server actions for staff to manage bookings from fishon-market:
 * - Force approve/reject bookings
 * - Initiate refunds
 * - Override booking status
 * - Add admin notes
 *
 * All actions require STAFF or ADMIN role and include audit logging.
 *
 * NOTE: These actions interact with bookings in the fishon-market database.
 */

"use server";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

type ActionResult = {
  success: boolean;
  error?: string;
  message?: string;
};

/**
 * Verify admin password before sensitive operations
 */
async function verifyAdminPassword(
  userId: string,
  password: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) return false;

    return await bcrypt.compare(password, user.passwordHash);
  } catch (error) {
    console.error("[verifyAdminPassword] Error:", error);
    return false;
  }
}

/**
 * Write audit log entry for admin actions
 *
 * NOTE: Uses existing AuditLog schema with fields:
 * - actorUserId (not actorId)
 * - entityType (not resourceType)
 * - entityId (not resourceId)
 * - before/after/changed for tracking changes (no metadata field)
 */
async function writeAuditLog({
  action,
  actorId,
  resourceType,
  resourceId,
  metadata,
  before,
  after,
}: {
  action: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}) {
  try {
    // Compute changed fields if before and after are provided
    const changed =
      before && after
        ? Object.keys(after).filter((key) => before[key] !== after[key])
        : metadata
          ? Object.keys(metadata)
          : [];

    // Persist audit log to database using existing schema field names
    await prisma.auditLog.create({
      data: {
        action,
        actorUserId: actorId,
        entityType: resourceType,
        entityId: resourceId,
        before: (before || metadata || {}) as Prisma.InputJsonValue,
        after: (after || {}) as Prisma.InputJsonValue,
        changed,
      },
    });

    // Also log to console for debugging
    console.log("[AUDIT]", {
      action,
      actorUserId: actorId,
      entityType: resourceType,
      entityId: resourceId,
      before,
      after,
      changed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[writeAuditLog] Error:", error);
    // Don't throw - audit log failure shouldn't block the main operation
  }
}

/**
 * Force approve a booking (bypass captain approval)
 *
 * Use cases:
 * - Captain unresponsive or technical issues
 * - Manual override for special circumstances
 * - Emergency booking confirmation
 *
 * @param bookingId - Booking ID to approve
 * @param password - Admin password for verification
 * @param reason - Reason for force approval
 */
export async function forceApproveBooking(
  bookingId: string,
  password: string,
  reason: string
): Promise<ActionResult> {
  try {
    // 1. Verify session and role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // 2. Verify admin password
    const passwordValid = await verifyAdminPassword(user.id, password);
    if (!passwordValid) {
      return { success: false, error: "Invalid password" };
    }

    // 3. Fetch booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 4. Validate status transition
    if (booking.status !== "PENDING") {
      return {
        success: false,
        error: `Cannot force approve booking with status: ${booking.status}`,
      };
    }

    // 5. Update booking status
    const updatedBooking = await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        status: "AWAITING_PAYMENT",
        captainDecisionAt: new Date(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: `FORCE APPROVED by staff (${user.id}): ${reason}`,
      },
    });

    // 6. Write audit log
    await writeAuditLog({
      action: "FORCE_APPROVE_BOOKING",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: {
        reason,
        previousStatus: booking.status,
        newStatus: updatedBooking.status,
        userEmail: booking.user.email,
      },
    });

    // 7. Revalidate pages
    revalidatePath(`/staff/bookings/${bookingId}`);
    revalidatePath("/staff/bookings");

    // 8. TODO: Send notification to angler and captain
    // await sendBookingApprovedEmail(...)
    // await notifyCaptainOfForceApproval(...)

    return {
      success: true,
      message: "Booking force approved successfully",
    };
  } catch (error) {
    console.error("[forceApproveBooking] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Force reject a booking (bypass captain decision)
 *
 * Use cases:
 * - Policy violations or suspicious activity
 * - Technical issues preventing normal flow
 * - Manual dispute resolution
 *
 * @param bookingId - Booking ID to reject
 * @param password - Admin password for verification
 * @param reason - Reason for force rejection (shown to angler)
 */
export async function forceRejectBooking(
  bookingId: string,
  password: string,
  reason: string
): Promise<ActionResult> {
  try {
    // 1. Verify session and role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // 2. Verify admin password
    const passwordValid = await verifyAdminPassword(user.id, password);
    if (!passwordValid) {
      return { success: false, error: "Invalid password" };
    }

    // 3. Fetch booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 4. Validate status transition
    if (
      !["PENDING", "AWAITING_PAYMENT", "PAYMENT_AUTHORIZED"].includes(
        booking.status
      )
    ) {
      return {
        success: false,
        error: `Cannot force reject booking with status: ${booking.status}`,
      };
    }

    // 5. Check if refund is needed
    const needsRefund = [
      "AWAITING_PAYMENT",
      "PAYMENT_AUTHORIZED",
      "PAID",
    ].includes(booking.status);

    if (needsRefund && !booking.paymentAuthorizedAt) {
      return {
        success: false,
        error:
          "Booking has payment but no payment authorization. Please initiate refund first.",
      };
    }

    // 6. Update booking status
    const updatedBooking = await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        status: "REJECTED",
        rejectionReason: reason,
        captainDecisionAt: new Date(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: `FORCE REJECTED by staff (${user.id}): ${reason}`,
        // If payment was authorized, release it
        ...(needsRefund && {
          paymentReleasedAt: new Date(),
          refundStatus: "PENDING",
          refundReason: `Force rejected by staff: ${reason}`,
        }),
      },
    });

    // 7. Write audit log
    await writeAuditLog({
      action: "FORCE_REJECT_BOOKING",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: {
        reason,
        previousStatus: booking.status,
        newStatus: updatedBooking.status,
        needsRefund,
        userEmail: booking.user.email,
      },
    });

    // 8. Revalidate pages
    revalidatePath(`/staff/bookings/${bookingId}`);
    revalidatePath("/staff/bookings");

    // 9. TODO: Send notification to angler and captain
    // await sendBookingRejectedEmail(...)
    // if (needsRefund) await initiateRefund(...)

    return {
      success: true,
      message: needsRefund
        ? "Booking force rejected and refund initiated"
        : "Booking force rejected successfully",
    };
  } catch (error) {
    console.error("[forceRejectBooking] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initiate refund for a booking
 *
 * Use cases:
 * - Cancellation after payment
 * - Force rejection with payment
 * - Manual refund for disputes
 *
 * @param bookingId - Booking ID to refund
 * @param password - Admin password for verification
 * @param reason - Reason for refund
 * @param amount - Optional partial refund amount (defaults to full)
 */
export async function initiateBookingRefund(
  bookingId: string,
  password: string,
  reason: string,
  amount?: number
): Promise<ActionResult> {
  try {
    // 1. Verify session and role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // 2. Verify admin password
    const passwordValid = await verifyAdminPassword(user.id, password);
    if (!passwordValid) {
      return { success: false, error: "Invalid password" };
    }

    // 3. Fetch booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 4. Validate refund eligibility
    if (!booking.paymentAuthorizedAt && !booking.paidAt) {
      return {
        success: false,
        error: "No payment to refund",
      };
    }

    if (booking.refundStatus === "COMPLETED") {
      return {
        success: false,
        error: "Refund already completed",
      };
    }

    if (booking.refundStatus === "PROCESSING") {
      return {
        success: false,
        error: "Refund already in progress",
      };
    }

    // 5. Calculate refund amount
    const refundAmount = amount || Number(booking.finalPrice);

    if (refundAmount > Number(booking.finalPrice)) {
      return {
        success: false,
        error: "Refund amount exceeds booking total",
      };
    }

    // 6. Update booking with refund info
    await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        refundStatus: "PROCESSING",
        refundAmount,
        refundReason: reason,
        refundedBy: user.id,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: `REFUND INITIATED by staff (${user.id}): ${reason}`,
      },
    });

    // 7. Write audit log
    await writeAuditLog({
      action: "INITIATE_REFUND",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: {
        reason,
        refundAmount,
        originalAmount: Number(booking.finalPrice),
        paymentMethod: booking.paymentMethod,
        userEmail: booking.user.email,
      },
    });

    // 8. Revalidate pages
    revalidatePath(`/staff/bookings/${bookingId}`);
    revalidatePath("/staff/bookings");

    // 9. TODO: Call payment gateway to process refund
    // await processRefund(bookingId, refundAmount)

    return {
      success: true,
      message: `Refund of RM ${refundAmount.toFixed(2)} initiated successfully`,
    };
  } catch (error) {
    console.error("[initiateBookingRefund] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Override booking status (admin power tool)
 *
 * Use cases:
 * - Fix stuck bookings
 * - Manual status corrections
 * - Emergency overrides
 *
 * WARNING: This bypasses all normal flow validations.
 * Use with extreme caution.
 *
 * @param bookingId - Booking ID to update
 * @param password - Admin password for verification
 * @param newStatus - Target status
 * @param reason - Detailed reason for override
 */
export async function overrideBookingStatus(
  bookingId: string,
  password: string,
  newStatus: string,
  reason: string
): Promise<ActionResult> {
  try {
    // 1. Verify session and role (ADMIN only for this dangerous operation)
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "ADMIN") {
      return {
        success: false,
        error: "Status override requires ADMIN role",
      };
    }

    // 2. Verify admin password
    const passwordValid = await verifyAdminPassword(user.id, password);
    if (!passwordValid) {
      return { success: false, error: "Invalid password" };
    }

    // 3. Fetch booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: { user: { select: { email: true } } },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 4. Validate new status
    const validStatuses = [
      "PENDING",
      "AWAITING_PAYMENT",
      "PAYMENT_AUTHORIZED",
      "PAID",
      "UNDER_REVIEW",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
      "EXPIRED",
    ];

    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: `Invalid status: ${newStatus}`,
      };
    }

    // 5. Update booking status
    await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        // Status is validated against validStatuses array above
        status: newStatus as
          | "PENDING"
          | "AWAITING_PAYMENT"
          | "PAYMENT_AUTHORIZED"
          | "PAID"
          | "UNDER_REVIEW"
          | "COMPLETED"
          | "REJECTED"
          | "CANCELLED"
          | "EXPIRED",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: `STATUS OVERRIDE by admin (${user.id}): ${booking.status} → ${newStatus}. Reason: ${reason}`,
      },
    });

    // 6. Write audit log
    await writeAuditLog({
      action: "OVERRIDE_BOOKING_STATUS",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: {
        reason,
        previousStatus: booking.status,
        newStatus,
        userEmail: booking.user.email,
        warning: "DANGEROUS: Manual status override bypassing normal flow",
      },
    });

    // 7. Revalidate pages
    revalidatePath(`/staff/bookings/${bookingId}`);
    revalidatePath("/staff/bookings");

    return {
      success: true,
      message: `Status overridden: ${booking.status} → ${newStatus}`,
    };
  } catch (error) {
    console.error("[overrideBookingStatus] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark booking as completed (force completion)
 *
 * Use cases:
 * - Trip completed but not marked by captain
 * - Manual completion for tracking
 *
 * @param bookingId - Booking ID to complete
 * @param password - Admin password for verification
 * @param notes - Optional completion notes
 */
export async function markBookingCompleted(
  bookingId: string,
  password: string,
  notes?: string
): Promise<ActionResult> {
  try {
    // 1. Verify session and role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // 2. Verify admin password
    const passwordValid = await verifyAdminPassword(user.id, password);
    if (!passwordValid) {
      return { success: false, error: "Invalid password" };
    }

    // 3. Fetch booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 4. Validate status transition
    if (booking.status !== "PAID") {
      return {
        success: false,
        error: `Can only mark PAID bookings as completed. Current status: ${booking.status}`,
      };
    }

    // 5. Update booking status
    await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        status: "COMPLETED",
        reviewedBy: user.id,
        reviewedAt: new Date(),
        reviewNotes: notes
          ? `COMPLETED by staff (${user.id}): ${notes}`
          : `COMPLETED by staff (${user.id})`,
      },
    });

    // 6. Write audit log
    await writeAuditLog({
      action: "MARK_BOOKING_COMPLETED",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: { notes, previousStatus: booking.status },
    });

    // 7. Revalidate pages
    revalidatePath(`/staff/bookings/${bookingId}`);
    revalidatePath("/staff/bookings");

    return {
      success: true,
      message: "Booking marked as completed",
    };
  } catch (error) {
    console.error("[markBookingCompleted] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Add admin note to booking (for internal documentation)
 *
 * @param bookingId - Booking ID
 * @param note - Admin note text
 */
export async function addBookingAdminNote(
  bookingId: string,
  note: string
): Promise<ActionResult> {
  try {
    // 1. Verify session and role
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const user = session.user as { id: string; role?: string };
    if (user.role !== "STAFF" && user.role !== "ADMIN") {
      return { success: false, error: "Insufficient permissions" };
    }

    // 2. Fetch current booking
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      select: { reviewNotes: true },
    });

    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    // 3. Append note with timestamp and user ID
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] Staff (${user.id}): ${note}`;
    const updatedNotes = booking.reviewNotes
      ? `${booking.reviewNotes}\n\n${newNote}`
      : newNote;

    // 4. Update booking
    await prismaMarket.booking.update({
      where: { id: bookingId },
      data: { reviewNotes: updatedNotes },
    });

    // 5. Write audit log
    await writeAuditLog({
      action: "ADD_ADMIN_NOTE",
      actorId: user.id,
      resourceType: "Booking",
      resourceId: bookingId,
      metadata: { note },
    });

    // 6. Revalidate
    revalidatePath(`/staff/bookings/${bookingId}`);

    return {
      success: true,
      message: "Admin note added",
    };
  } catch (error) {
    console.error("[addBookingAdminNote] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
