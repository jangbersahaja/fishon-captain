import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getUser(session: unknown): { id: string; role?: string } | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user as
    | { id?: string; role?: string }
    | undefined;
  if (!user?.id) return null;
  return { id: user.id, role: user.role };
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = getUser(session);
  if (!user || user.role !== "ADMIN") {
    return applySecurityHeaders(
      NextResponse.json({ error: "forbidden" }, { status: 403 })
    );
  }
  const { id: charterId } = await context.params;
  // Transaction: delete all related except draft, charter photos, and captain profile
  try {
    await prisma.$transaction(async (tx) => {
      // Remove all CharterMedia except photos
      await tx.charterMedia.deleteMany({
        where: {
          charterId,
          kind: { not: "CHARTER_PHOTO" },
        },
      });
      // Remove all CaptainVideo for this charter
      await tx.captainVideo.deleteMany({ where: { charterId } });
      // Remove all amenities, features, policies, pickup, pickup areas
      await tx.charterAmenity.deleteMany({ where: { charterId } });
      await tx.charterFeature.deleteMany({ where: { charterId } });
      await tx.policies.deleteMany({ where: { charterId } });
      // Remove pickup areas and pickup
      const pickup = await tx.pickup.findUnique({ where: { charterId } });
      if (pickup) {
        await tx.pickupArea.deleteMany({ where: { pickupId: pickup.id } });
        await tx.pickup.delete({ where: { charterId } });
      }
      // Remove all trips and their related data
      const trips = await tx.trip.findMany({ where: { charterId } });
      for (const trip of trips) {
        await tx.charterMedia.deleteMany({ where: { tripId: trip.id } });
        await tx.tripStartTime.deleteMany({ where: { tripId: trip.id } });
        await tx.tripSpecies.deleteMany({ where: { tripId: trip.id } });
        await tx.tripTechnique.deleteMany({ where: { tripId: trip.id } });
      }
      await tx.trip.deleteMany({ where: { charterId } });
      // Remove boat
      const charter = await tx.charter.findUnique({ where: { id: charterId } });
      if (charter?.boatId) {
        await tx.boat.delete({ where: { id: charter.boatId } });
      }
      // Finally, delete the charter itself
      await tx.charter.delete({ where: { id: charterId } });
    });
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  } catch (e) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "delete_failed",
          message: e instanceof Error ? e.message : String(e),
        },
        { status: 500 }
      )
    );
  }
}
