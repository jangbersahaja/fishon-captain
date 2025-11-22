import authOptions from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimiter";
import { getBookingsFinancial } from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
// Types from fishon-market
type BookingStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";
type PayoutStatus =
  | "PENDING"
  | "SCHEDULED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "ON_HOLD";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (role !== "STAFF" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit: 3 requests per minute
    const identifier = session.user.id || "unknown";
    const { allowed } = await rateLimit({
      key: `export:${identifier}`,
      windowMs: 60000, // 1 minute
      max: 3,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Parse filters from query params
    const { searchParams } = new URL(req.url);
    const filters = {
      bookingStatus: searchParams.get("bookingStatus") as
        | BookingStatus
        | undefined,
      payoutStatus: searchParams.get("payoutStatus") as
        | PayoutStatus
        | undefined,
      startDate: searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined,
      endDate: searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined,
    };

    // Fetch bookings
    const bookings = await getBookingsFinancial(filters);

    // Generate CSV
    const headers = [
      "Booking ID",
      "Charter",
      "Owner",
      "Angler",
      "Trip Date",
      "Revenue (RM)",
      "Commission (RM)",
      "Captain Earnings (RM)",
      "Payout Status",
      "Payment Method",
      "Transaction ID",
      "Paid At",
    ];

    const rows = bookings.map((booking) => [
      booking.id,
      booking.charterName || "N/A",
      booking.ownerName || "N/A",
      booking.anglerName || "N/A",
      new Date(booking.tripDate).toLocaleDateString("en-MY", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Asia/Kuala_Lumpur",
      }),
      booking.finalPrice?.toFixed(2) || "0.00",
      booking.platformFee?.toFixed(2) || "0.00",
      booking.captainEarnings?.toFixed(2) || "0.00",
      booking.payoutStatus || "N/A",
      booking.paymentMethod || "N/A",
      booking.paymentTransactionId || "N/A",
      booking.paidAt
        ? new Date(booking.paidAt).toLocaleString("en-MY", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kuala_Lumpur",
          })
        : "N/A",
    ]);

    // Build CSV string
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Return CSV file
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `bookings-export-${timestamp}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting bookings:", error);
    return NextResponse.json(
      { error: "Failed to export bookings" },
      { status: 500 }
    );
  }
}
