"use server";

import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

/**
 * Approve a booking as a captain
 *
 * - Verify captain owns the charter
 * - Update booking status to PAID
 * - Unlock conversation if status is LOCKED
 * - Send system message to conversation
 * - Revalidate pages
 */
export async function approveBooking(bookingId: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const userId = session.user.id;

    // Get booking details
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: {
        conversation: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    // Verify captain owns the charter
    const charter = await prisma.charter.findUnique({
      where: { id: booking.charterId },
      select: { ownerId: true },
    });

    if (!charter || charter.ownerId !== userId) {
      return {
        success: false,
        error: "Forbidden: You don't own this charter",
      };
    }

    // Update booking status
    const updatedBooking = await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        status: "PAID",
        approvedAt: new Date(),
        approvedByUserId: userId,
      },
    });

    // Unlock conversation if needed
    if (booking.conversation && booking.conversation.status === "LOCKED") {
      await prismaMarket.conversation.update({
        where: { id: booking.conversation.id },
        data: { status: "UNLOCKED" },
      });
    }

    // Send system message
    if (booking.conversation) {
      await prismaMarket.message.create({
        data: {
          conversationId: booking.conversation.id,
          senderId: userId,
          senderType: "system",
          senderName: "System",
          content: "Captain approved your booking 🎉",
          contentType: "system",
          systemType: "booking_approved",
        },
      });
    }

    logger.info("Booking approved", {
      bookingId,
      captainId: userId,
      conversationId: booking.conversation?.id,
    });

    // Revalidate relevant pages
    revalidatePath("/captain/messages");
    revalidatePath(`/captain/messages/${booking.conversation?.id}`);

    return {
      success: true,
      booking: updatedBooking,
    };
  } catch (error) {
    logger.error("Error approving booking", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: "Failed to approve booking",
    };
  }
}

/**
 * Reject a booking as a captain
 *
 * - Verify captain owns the charter
 * - Update booking status to CANCELLED
 * - Send rejection message to conversation
 */
export async function rejectBooking(
  bookingId: string,
  rejectionReason: string = ""
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const userId = session.user.id;

    // Get booking details
    const booking = await prismaMarket.booking.findUnique({
      where: { id: bookingId },
      include: {
        conversation: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    // Verify captain owns the charter
    const charter = await prisma.charter.findUnique({
      where: { id: booking.charterId },
      select: { ownerId: true },
    });

    if (!charter || charter.ownerId !== userId) {
      return {
        success: false,
        error: "Forbidden: You don't own this charter",
      };
    }

    // Update booking status
    const updatedBooking = await prismaMarket.booking.update({
      where: { id: bookingId },
      data: {
        status: "REJECTED",
        rejectionReason,
        rejectedAt: new Date(),
        rejectedByUserId: userId,
      },
    });

    // Send rejection message
    if (booking.conversation) {
      const message = rejectionReason
        ? `Captain rejected your booking: ${rejectionReason}`
        : "Captain rejected your booking";

      await prismaMarket.message.create({
        data: {
          conversationId: booking.conversation.id,
          senderId: userId,
          senderType: "system",
          senderName: "System",
          content: message,
          contentType: "system",
          systemType: "booking_rejected",
        },
      });

      // Close conversation
      await prismaMarket.conversation.update({
        where: { id: booking.conversation.id },
        data: { status: "CLOSED", closedAt: new Date(), closedBy: "system" },
      });
    }

    logger.info("Booking rejected", {
      bookingId,
      captainId: userId,
      reason: rejectionReason,
    });

    revalidatePath("/captain/messages");

    return {
      success: true,
      booking: updatedBooking,
    };
  } catch (error) {
    logger.error("Error rejecting booking", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return {
      success: false,
      error: "Failed to reject booking",
    };
  }
}
