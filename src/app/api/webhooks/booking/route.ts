import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification-service";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * Webhook receiver for booking updates from fishon-market
 *
 * This endpoint receives notifications when bookings are created, cancelled, or paid
 * in fishon-market, then revalidates relevant captain dashboard pages and creates notifications.
 *
 * Security: Validates x-captain-secret header
 */
export async function POST(request: NextRequest) {
  console.log("🔔 [WEBHOOK] Received request to /api/webhooks/booking");

  try {
    // Verify webhook secret
    const secret = process.env.CAPTAIN_API_SECRET;
    if (!secret) {
      console.error("❌ [WEBHOOK] CAPTAIN_API_SECRET not configured");
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const providedSecret = request.headers.get("x-captain-secret");
    console.log("🔑 [WEBHOOK] Checking secret...", {
      provided: providedSecret ? "present" : "missing",
      expected: secret ? "present" : "missing",
      match: providedSecret === secret,
    });

    if (providedSecret !== secret) {
      console.warn("❌ [WEBHOOK] Invalid webhook secret provided");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse webhook payload
    const body = await request.json().catch(() => ({}));
    const { type, booking } = body as {
      type?: string;
      booking?: {
        id: string;
        tripId?: string;
        charterId?: string;
        status?: string;
        date?: string;
        anglerName?: string;
        charterName?: string;
        bookingFlowType?: string;
        paymentFlow?: string;
      };
    };

    if (!type || !booking?.id) {
      return NextResponse.json(
        { error: "Invalid payload: type and booking.id required" },
        { status: 400 }
      );
    }

    // Log webhook received
    console.log(`📨 Webhook received: ${type} for booking ${booking.id}`);

    // Fetch captain user ID from charter
    let captainUserId: string | undefined;
    if (booking.charterId) {
      const charter = await prisma.charter.findUnique({
        where: { id: booking.charterId },
        select: {
          captain: {
            select: { userId: true },
          },
        },
      });
      captainUserId = charter?.captain?.userId;
    }

    // Create notification for captain based on webhook type
    if (captainUserId) {
      console.log(
        `📬 [WEBHOOK] Creating notification for captain user: ${captainUserId}`
      );
      try {
        switch (type) {
          case "booking.created":
            console.log(
              `📝 [WEBHOOK] Creating BOOKING_RECEIVED notification...`,
              {
                bookingFlowType: booking.bookingFlowType,
                status: booking.status,
              }
            );

            // For AUTO flow with PAYMENT_AUTHORIZED, show different message
            const isAutoFlowPaid =
              booking.bookingFlowType === "AUTO" &&
              booking.status === "PAYMENT_AUTHORIZED";

            await createNotification({
              type: "BOOKING_RECEIVED",
              userId: captainUserId,
              title: isAutoFlowPaid
                ? "New Paid Booking! 💰"
                : "New Booking Request! 🎣",
              message: isAutoFlowPaid
                ? `${booking.anglerName || "An angler"} booked ${
                    booking.charterName || "your charter"
                  }${booking.date ? ` on ${new Date(booking.date).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}. Payment authorized and secured!`
                : `${booking.anglerName || "An angler"} requested a booking for ${
                    booking.charterName || "your charter"
                  }${booking.date ? ` on ${new Date(booking.date).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}.`,
              actionUrl: `/captain/bookings?highlight=${booking.id}`,
              actionLabel: isAutoFlowPaid ? "View Booking" : "Review Request",
              metadata: {
                bookingId: booking.id,
                charterId: booking.charterId,
                anglerName: booking.anglerName,
                date: booking.date,
                bookingFlowType: booking.bookingFlowType,
                status: booking.status,
              },
            });
            console.log(
              `✅ BOOKING_RECEIVED notification sent to captain ${captainUserId} (flowType: ${booking.bookingFlowType}, status: ${booking.status})`
            );
            break;

          case "booking.payment_pending":
            console.log(
              `💰 [WEBHOOK] Creating PAYMENT_PENDING notification...`
            );
            await createNotification({
              type: "PAYMENT_PENDING",
              userId: captainUserId,
              title: "Payment Received - Action Required! 💰",
              message: `${booking.anglerName || "An angler"} has paid for a booking on ${
                booking.charterName || "your charter"
              }${booking.date ? ` on ${new Date(booking.date).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}. Please review and approve to confirm the trip.`,
              actionUrl: `/captain/bookings/${booking.id}`,
              actionLabel: "Review & Approve",
              metadata: {
                bookingId: booking.id,
                charterId: booking.charterId,
                anglerName: booking.anglerName,
                date: booking.date,
              },
            });
            console.log(
              `✅ PAYMENT_PENDING notification sent to captain ${captainUserId}`
            );
            break;

          case "booking.cancelled":
            await createNotification({
              type: "BOOKING_CANCELLED",
              userId: captainUserId,
              title: "Booking Cancelled",
              message: `${booking.anglerName || "The angler"} cancelled their booking for ${
                booking.charterName || "your charter"
              }${booking.date ? ` on ${new Date(booking.date).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""}.`,
              actionUrl: `/captain/bookings?filter=cancelled`,
              actionLabel: "View Cancelled",
              metadata: {
                bookingId: booking.id,
                charterId: booking.charterId,
                anglerName: booking.anglerName,
                date: booking.date,
              },
            });
            console.log(
              `✅ BOOKING_CANCELLED notification sent to captain ${captainUserId}`
            );
            break;

          case "booking.confirmed":
            console.log(
              `✅ [WEBHOOK] Creating BOOKING_CONFIRMED notification...`
            );
            await createNotification({
              type: "BOOKING_CONFIRMED",
              userId: captainUserId,
              title: "Booking Confirmed! ✅",
              message: `Booking with ${booking.anglerName || "the angler"} for ${
                booking.charterName || "your charter"
              }${booking.date ? ` on ${new Date(booking.date).toLocaleDateString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}` : ""} has been confirmed. Payment secured!`,
              actionUrl: `/captain/bookings/${booking.id}`,
              actionLabel: "View Details",
              metadata: {
                bookingId: booking.id,
                charterId: booking.charterId,
                anglerName: booking.anglerName,
                date: booking.date,
              },
            });
            console.log(
              `✅ BOOKING_CONFIRMED notification sent to captain ${captainUserId}`
            );
            break;

          case "booking.paid":
            await createNotification({
              type: "BOOKING_PAID",
              userId: captainUserId,
              title: "Payment Received! 💰",
              message: `${booking.anglerName || "The angler"} has paid for their booking on ${
                booking.date
                  ? new Date(booking.date).toLocaleDateString("en-MY", {
                      timeZone: "Asia/Kuala_Lumpur",
                    })
                  : "the scheduled date"
              }. Trip confirmed!`,
              actionUrl: `/captain/bookings/${booking.id}`,
              actionLabel: "View Details",
              metadata: {
                bookingId: booking.id,
                charterId: booking.charterId,
                anglerName: booking.anglerName,
                date: booking.date,
              },
            });
            console.log(
              `✅ BOOKING_PAID notification sent to captain ${captainUserId}`
            );
            break;

          default:
            console.warn(`⚠️ Unknown webhook type for notification: ${type}`);
        }
      } catch (notificationError) {
        console.error("❌ Notification creation failed:", notificationError);
        // Don't fail the webhook if notification fails
      }
    } else {
      console.warn(
        `⚠️ Could not find captain user ID for charter ${booking.charterId}`
      );
    }

    // Revalidate captain dashboard pages
    try {
      revalidatePath("/captain/bookings", "page");
      revalidatePath(`/captain/bookings/${booking.id}`, "page");
      revalidatePath("/captain/dashboard", "page");
      revalidatePath("/captain/calendar", "page");
      revalidatePath("/captain/messages", "page");

      console.log(`✅ Revalidated captain pages for booking ${booking.id}`);
    } catch (error) {
      console.error("❌ Revalidation failed:", error);
      // Don't fail the webhook if revalidation fails
    }

    return NextResponse.json({
      received: true,
      revalidated: true,
      type,
      bookingId: booking.id,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
