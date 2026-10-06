/**
 * GET /api/captain/bookings/:id
 *
 * Returns a single booking owned by the authenticated captain, shaped for the
 * Fishon mobile app. Replaces the mobile client's previous use of the angler
 * endpoint (`/api/account/bookings/:id`), which returns 403 for captains.
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Authorization: the booking's charter must be owned by the authenticated
 * captain (Charter.ownerId === userId). Returns 404 (not 403) when the booking
 * exists but is not the captain's, to avoid leaking booking existence.
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { toMobileBookingDto } from "@/lib/api/mobile-booking-dto";
import { getBooking } from "@/lib/booking-service";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { prismaMarket } from "@/lib/prisma-market";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    const booking = await getBooking(id);
    if (!booking) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Booking not found" }, { status: 404 })
      );
    }

    // Ownership check: the charter on this booking must belong to the captain.
    const charter = await prisma.charter.findUnique({
      where: { id: booking.charterId },
      select: { ownerId: true },
    });

    if (!charter || charter.ownerId !== userId) {
      // Mask existence of other captains' bookings.
      return applySecurityHeaders(
        NextResponse.json({ error: "Booking not found" }, { status: 404 })
      );
    }

    // Resolve cover image (lowest sortOrder) for the booking's charter.
    const media = await prisma.charterMedia.findFirst({
      where: { charterId: booking.charterId },
      select: { url: true },
      orderBy: { sortOrder: "asc" },
    });

    // Resolve angler contact (email/name/phone) from the market User.
    let anglerContact: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null = null;
    try {
      const anglerUser = await prismaMarket.marketUser.findUnique({
        where: { id: booking.userId },
        select: { name: true, email: true, phone: true },
      });
      if (anglerUser) {
        anglerContact = {
          name: anglerUser.name ?? null,
          email: anglerUser.email ?? null,
          phone: anglerUser.phone ?? null,
        };
      }
    } catch (err) {
      // Non-fatal: fall back to participant data in the DTO mapper.
      console.warn(
        `[GET /api/captain/bookings/${id}] angler lookup failed:`,
        err
      );
    }

    const dto = toMobileBookingDto(booking, media?.url ?? null, anglerContact);

    return applySecurityHeaders(NextResponse.json({ booking: dto }));
  } catch (error) {
    console.error(`[GET /api/captain/bookings/${id}] error:`, error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to load booking" }, { status: 500 })
    );
  }
}
