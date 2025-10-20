import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { diffObjects, writeAuditLog } from "@/server/audit";
import { CharterUpdateSchema } from "@fishon/schemas";
import { CharterStyle, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { z } from "zod";

interface CharterUpdateData {
  charterType?: string;
  name?: string;
  state?: string;
  city?: string;
  startingPoint?: string;
  postcode?: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string;
  backupPhone?: string | null;
  [key: string]: unknown;
}

interface TripUpdateData {
  id?: string | null;
  _delete?: boolean;
  name?: string;
  tripType?: string;
  price?: number | null;
  promoPrice?: number | null;
  durationHours?: number | null;
  maxAnglers?: number | null;
  style?: string;
  description?: string | null;
  startTimes?: string[];
  species?: string[];
  techniques?: string[];
  [key: string]: unknown;
}

interface SessionLikeUser {
  id?: string;
}
interface SessionLike {
  user?: SessionLikeUser;
}
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionLike).user;
  if (!user || typeof user !== "object") return null;
  return typeof user.id === "string" ? user.id : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: { captain: { select: { userId: true, id: true } } },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );
  const parsed = CharterUpdateSchema.safeParse(body);
  if (!parsed.success)
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "invalid_payload",
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      )
    );
  const data = parsed.data as z.infer<typeof CharterUpdateSchema>;

  // Snapshot BEFORE (lean) for audit
  const beforeSnapshot = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      boat: true,
      amenities: true,
      features: true,
      policies: true,
      pickup: { include: { areas: true } },
      trips: { include: { startTimes: true, species: true, techniques: true } },
      captain: {
        select: {
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Collect mutations
  const tx: Prisma.PrismaPromise<unknown>[] = [];

  if (data.charter && Object.keys(data.charter).length) {
    // Exclude non-persistent helper fields (tone) before persisting
    if ("tone" in data.charter)
      delete (data.charter as Record<string, unknown>)["tone"]; // defensive
    // Patch: ensure backupPhone is updated on charter table
    const charterUpdateData: CharterUpdateData = { ...data.charter };
    const captain = data.captain as { backupPhone?: string };
    if (captain && typeof captain.backupPhone === "string") {
      charterUpdateData.backupPhone = captain.backupPhone;
    } else if (
      captain &&
      typeof captain.backupPhone === "undefined" &&
      "backupPhone" in captain
    ) {
      charterUpdateData.backupPhone = undefined;
    }
    tx.push(
      prisma.charter.update({
        where: { id: charter.id },
        data: charterUpdateData,
      })
    );
  }

  if (data.captain && Object.keys(data.captain).length) {
    // Need captain profile id; charter query included captain.id
    tx.push(
      prisma.captainProfile.update({
        where: { id: charter.captain.id },
        data: {
          displayName: data.captain.displayName ?? undefined,
          phone: data.captain.phone ?? undefined,
          bio: data.captain.bio ?? undefined,
          experienceYrs: data.captain.experienceYrs ?? undefined,
        },
      })
    );
  }

  if (data.boat && Object.keys(data.boat).length) {
    if (charter.boatId) {
      tx.push(
        prisma.boat.update({
          where: { id: charter.boatId },
          data: {
            name: data.boat.name ?? undefined,
            type: data.boat.type ?? undefined,
            lengthFt: data.boat.lengthFt ?? undefined,
            capacity: data.boat.capacity ?? undefined,
          },
        })
      );
    } else {
      tx.push(
        prisma.boat.create({
          data: {
            name: data.boat.name || "",
            type: data.boat.type || "",
            lengthFt: data.boat.lengthFt || 0,
            capacity: data.boat.capacity || 0,
            charter: { connect: { id: charter.id } },
          },
        })
      );
    }
  }

  if (data.amenities) {
    const existing = await prisma.charterAmenity.findMany({
      where: { charterId },
      select: { label: true },
    });
    const existingSet = new Set(existing.map((a) => a.label));
    const incomingSet = new Set(data.amenities);
    const toRemove = existing.filter((a) => !incomingSet.has(a.label));
    const toAdd = data.amenities.filter((l) => !existingSet.has(l));
    if (toRemove.length) {
      tx.push(
        prisma.charterAmenity.deleteMany({
          where: { charterId, label: { in: toRemove.map((r) => r.label) } },
        })
      );
    }
    if (toAdd.length) {
      tx.push(
        prisma.charterAmenity.createMany({
          data: toAdd.map((label) => ({ charterId, label })),
        })
      );
    }
  }
  if (data.features) {
    const existing = await prisma.charterFeature.findMany({
      where: { charterId },
      select: { label: true },
    });
    const existingSet = new Set(existing.map((a) => a.label));
    const incomingSet = new Set(data.features);
    const toRemove = existing.filter((a) => !incomingSet.has(a.label));
    const toAdd = data.features.filter((l) => !existingSet.has(l));
    if (toRemove.length) {
      tx.push(
        prisma.charterFeature.deleteMany({
          where: { charterId, label: { in: toRemove.map((r) => r.label) } },
        })
      );
    }
    if (toAdd.length) {
      tx.push(
        prisma.charterFeature.createMany({
          data: toAdd.map((label) => ({ charterId, label })),
        })
      );
    }
  }
  if (data.policies) {
    const existingPolicies = await prisma.policies.findUnique({
      where: { charterId },
    });
    if (existingPolicies) {
      tx.push(
        prisma.policies.update({
          where: { charterId },
          data: { ...data.policies },
        })
      );
    } else {
      tx.push(
        prisma.policies.create({
          data: {
            charterId,
            licenseProvided: data.policies.licenseProvided ?? false,
            catchAndKeep: data.policies.catchAndKeep ?? false,
            catchAndRelease: data.policies.catchAndRelease ?? false,
            childFriendly: data.policies.childFriendly ?? false,
            liveBaitProvided: data.policies.liveBaitProvided ?? false,
            alcoholNotAllowed: data.policies.alcoholNotAllowed ?? false,
            smokingNotAllowed: data.policies.smokingNotAllowed ?? false,
          },
        })
      );
    }
  }
  if (data.pickup) {
    const existingPickup = await prisma.pickup.findUnique({
      where: { charterId },
      include: { areas: true },
    });
    if (existingPickup) {
      tx.push(
        prisma.pickupArea.deleteMany({ where: { pickupId: existingPickup.id } })
      );
      tx.push(
        prisma.pickup.update({
          where: { charterId },
          data: {
            available: data.pickup.available ?? existingPickup.available,
            fee:
              data.pickup.fee === undefined
                ? existingPickup.fee
                : data.pickup.fee,
            notes: data.pickup.notes ?? existingPickup.notes,
          },
        })
      );
      if (data.pickup.areas && data.pickup.areas.length) {
        tx.push(
          prisma.pickupArea.createMany({
            data: data.pickup.areas.map((label) => ({
              pickupId: existingPickup.id,
              label,
            })),
          })
        );
      }
    } else {
      tx.push(
        prisma.pickup.create({
          data: {
            charterId,
            available: data.pickup.available || false,
            fee: data.pickup.fee || null,
            notes: data.pickup.notes || "",
            areas: data.pickup.areas?.length
              ? { create: data.pickup.areas.map((label) => ({ label })) }
              : undefined,
          },
        })
      );
    }
  }
  if (data.trips) {
    // Upsert trips: simplistic replace strategy (could diff later)
    const existingTrips = await prisma.trip.findMany({
      where: { charterId },
      select: { id: true },
    });
    const keepIds = new Set<string>();
    for (const t of data.trips) {
      const trip: TripUpdateData = t;
      if (trip._delete && trip.id) continue;
      if (trip.id && existingTrips.find((et) => et.id === trip.id)) {
        keepIds.add(trip.id);
        tx.push(
          prisma.trip.update({
            where: { id: trip.id },
            data: {
              name: trip.name ?? undefined,
              tripType: trip.tripType ?? undefined,
              price: trip.price ?? undefined,
              promoPrice:
                trip.promoPrice !== undefined ? trip.promoPrice : undefined,
              durationHours: trip.durationHours ?? undefined,
              maxAnglers: trip.maxAnglers ?? undefined,
              style: trip.style
                ? Object.values(CharterStyle).includes(
                    trip.style.toUpperCase() as CharterStyle
                  )
                  ? (trip.style.toUpperCase() as CharterStyle)
                  : undefined
                : undefined,
              description: trip.description ?? undefined,
            },
          })
        );
        if (t.startTimes) {
          if (typeof t.id === "string") {
            tx.push(
              prisma.tripStartTime.deleteMany({ where: { tripId: t.id } })
            );
            if (t.startTimes.length)
              tx.push(
                prisma.tripStartTime.createMany({
                  data: t.startTimes.map((value) => ({
                    tripId: t.id as string,
                    value,
                  })),
                })
              );
          }
        }
        if (t.species) {
          if (typeof t.id === "string") {
            tx.push(prisma.tripSpecies.deleteMany({ where: { tripId: t.id } }));
            if (t.species.length)
              tx.push(
                prisma.tripSpecies.createMany({
                  data: t.species.map((value) => ({
                    tripId: t.id as string,
                    value,
                  })),
                })
              );
          }
        }
        if (t.techniques) {
          if (typeof t.id === "string") {
            tx.push(
              prisma.tripTechnique.deleteMany({ where: { tripId: t.id } })
            );
            if (t.techniques.length)
              tx.push(
                prisma.tripTechnique.createMany({
                  data: t.techniques.map((value) => ({
                    tripId: t.id as string,
                    value,
                  })),
                })
              );
          }
        }
      } else {
        // create
        tx.push(
          prisma.trip.create({
            data: {
              charterId,
              name: trip.name || "",
              tripType: trip.tripType || "",
              price: trip.price || 0,
              promoPrice:
                trip.promoPrice !== undefined && trip.promoPrice !== null
                  ? trip.promoPrice
                  : undefined,
              durationHours: trip.durationHours || 0,
              maxAnglers: trip.maxAnglers || 0,
              style:
                trip.style &&
                Object.values(CharterStyle).includes(
                  trip.style.toUpperCase() as CharterStyle
                )
                  ? (trip.style.toUpperCase() as CharterStyle)
                  : CharterStyle.PRIVATE,
              description: trip.description || null,
              startTimes: trip.startTimes?.length
                ? { create: trip.startTimes.map((value) => ({ value })) }
                : undefined,
              species: trip.species?.length
                ? { create: trip.species.map((value) => ({ value })) }
                : undefined,
              techniques: trip.techniques?.length
                ? { create: trip.techniques.map((value) => ({ value })) }
                : undefined,
            },
          })
        );
      }
    }
    // Delete removed trips (must delete children first to satisfy FK constraints)
    for (const et of existingTrips) {
      if (!keepIds.has(et.id)) {
        if (et.id) {
          tx.push(
            prisma.tripStartTime.deleteMany({ where: { tripId: et.id } })
          );
          tx.push(prisma.tripSpecies.deleteMany({ where: { tripId: et.id } }));
          tx.push(
            prisma.tripTechnique.deleteMany({ where: { tripId: et.id } })
          );
          // In case there is trip-scoped media
          tx.push(prisma.charterMedia.deleteMany({ where: { tripId: et.id } }));
          tx.push(prisma.trip.delete({ where: { id: et.id } }));
        }
      }
    }
  }

  if (!tx.length) {
    return applySecurityHeaders(
      NextResponse.json({ ok: true, noChange: true })
    );
  }
  await prisma.$transaction(tx);

  // AFTER snapshot
  const afterSnapshot = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      boat: true,
      amenities: true,
      features: true,
      policies: true,
      pickup: { include: { areas: true } },
      trips: { include: { startTimes: true, species: true, techniques: true } },
      captain: {
        select: {
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
          avatarUrl: true,
        },
      },
    },
  });
  if (afterSnapshot) {
    const changedTop = diffObjects(beforeSnapshot, afterSnapshot);
    writeAuditLog({
      actorUserId: userId,
      entityType: "charter",
      entityId: charterId,
      action: "update",
      before: beforeSnapshot || undefined,
      after: afterSnapshot,
      changed: changedTop,
    }).catch(() => {});
  }

  const updated = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      captain: {
        select: {
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
          avatarUrl: true,
        },
      },
      boat: true,
      amenities: true,
      features: true,
      policies: true,
      pickup: { include: { areas: true } },
      trips: { include: { startTimes: true, species: true, techniques: true } },
    },
  });
  return applySecurityHeaders(
    NextResponse.json({ ok: true, charter: updated })
  );
}

// GET alias (same as /[id]/get) for convenience
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      boat: true,
      amenities: true,
      features: true,
      policies: true,
      pickup: { include: { areas: true } },
      trips: { include: { startTimes: true, species: true, techniques: true } },
      captain: {
        select: {
          userId: true,
          avatarUrl: true,
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
        },
      },
      media: {
        select: {
          url: true,
          sortOrder: true,
          storageKey: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      videos: {
        where: { processStatus: "ready" },
        select: {
          id: true,
          ready720pUrl: true,
          thumbnailUrl: true,
          processedDurationSec: true,
          blobKey: true,
          originalUrl: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  
  // IMPORTANT: use storageKey as the stable identifier (was previously sortOrder string which broke deletion)
  const images = charter.media.map((m) => ({
    name: m.storageKey,
    url: m.url,
  }));
  const videos = charter.videos.map((v) => ({
    name: v.blobKey || v.id,
    url: v.ready720pUrl || v.originalUrl,
    thumbnailUrl: v.thumbnailUrl || undefined,
    durationSeconds: v.processedDurationSec || undefined,
  }));
  return applySecurityHeaders(
    NextResponse.json({
      charter,
      media: { images, videos, avatar: charter.captain.avatarUrl || null },
    })
  );
}
