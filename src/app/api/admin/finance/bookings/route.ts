import authOptions from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimiter";
import {
  type BookingDateField,
  getBookingsFinancial,
} from "@/lib/services/finance-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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

    // Rate limit: 30 requests per minute
    const identifier = session.user.id || "unknown";
    const { allowed } = await rateLimit({
      key: `bookings-list:${identifier}`,
      windowMs: 60000,
      max: 30,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Parse filters from query params
    const { searchParams } = new URL(req.url);
    const dateField =
      (searchParams.get("dateField") as BookingDateField) || "paidAt";

    const filters = {
      status: searchParams.get("status") || undefined,
      payoutStatus: searchParams.get("payoutStatus") || undefined,
      dateField,
      startDate: searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined,
      endDate: searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined,
      limit: 500, // Higher limit for list view
    };

    // Fetch bookings
    const bookings = await getBookingsFinancial(filters);

    return NextResponse.json({
      bookings,
      filters: {
        status: filters.status,
        payoutStatus: filters.payoutStatus,
        dateField: filters.dateField,
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
