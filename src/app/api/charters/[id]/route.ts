import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { diffObjects, writeAuditLog } from "@/server/audit";
import { CharterStyle, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

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

// Schema for partial charter update (edit mode save)
const CharterUpdateSchema = z.object({
  charter: z
    .object({
      charterType: z.string().optional(),
      name: z.string().optional(),
      state: z.string().optional(),
      city: z.string().optional(),
      startingPoint: z.string().optional(),
      postcode: z.string().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
      description: z.string().optional(),
      // "tone" is a client-only helper for description generation; accept & ignore.
      tone: z.string().optional(),
    })
    .optional(),
  captain: z
    .object({
      displayName: z.string().optional(),
      phone: z.string().optional(),
      bio: z.string().optional(),
      experienceYrs: z.number().int().optional(),
    })
    .optional(),
  boat: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
      lengthFt: z.number().int().nullable().optional(),
      capacity: z.number().int().nullable().optional(),
      features: z.array(z.string()).optional(),
    })
    .optional(),
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  policies: z
    .object({
      licenseProvided: z.boolean().optional(),
      catchAndKeep: z.boolean().optional(),
      catchAndRelease: z.boolean().optional(),
      childFriendly: z.boolean().optional(),
      liveBaitProvided: z.boolean().optional(),
      alcoholNotAllowed: z.boolean().optional(),
      smokingNotAllowed: z.boolean().optional(),
    })
    .optional(),
  pickup: z
    .object({
      available: z.boolean().optional(),
      fee: z.number().nullable().optional(),
      notes: z.string().optional(),
      areas: z.array(z.string()).optional(),
    })
    .optional(),
  trips: z
    .array(
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().optional(),
        tripType: z.string().optional(),
        price: z.number().nullable().optional(),
        durationHours: z.number().int().nullable().optional(),
        maxAnglers: z.number().int().nullable().optional(),
        style: z.string().optional(),
        description: z.string().nullable().optional(),
        startTimes: z.array(z.string()).optional(),
        species: z.array(z.string()).optional(),
        techniques: z.array(z.string()).optional(),
        _delete: z.boolean().optional(),
      })
    )
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
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
  const data = parsed.data;

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
    tx.push(
      prisma.charter.update({
        where: { id: charter.id },
        data: { ...data.charter },
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
      if (t._delete && t.id) continue;
      if (t.id && existingTrips.find((et) => et.id === t.id)) {
        keepIds.add(t.id);
        tx.push(
          prisma.trip.update({
            where: { id: t.id },
            data: {
              name: t.name ?? undefined,
              tripType: t.tripType ?? undefined,
              price: t.price ?? undefined,
              durationHours: t.durationHours ?? undefined,
              maxAnglers: t.maxAnglers ?? undefined,
              style: t.style
                ? Object.values(CharterStyle).includes(
                    t.style.toUpperCase() as CharterStyle
                  )
                  ? (t.style.toUpperCase() as CharterStyle)
                  : undefined
                : undefined,
              description: t.description ?? undefined,
            },
          })
        );
        if (t.startTimes) {
          tx.push(prisma.tripStartTime.deleteMany({ where: { tripId: t.id } }));
          if (t.startTimes.length)
            tx.push(
              prisma.tripStartTime.createMany({
                data: t.startTimes.map((value) => ({ tripId: t.id!, value })),
              })
            );
        }
        if (t.species) {
          tx.push(prisma.tripSpecies.deleteMany({ where: { tripId: t.id } }));
          if (t.species.length)
            tx.push(
              prisma.tripSpecies.createMany({
                data: t.species.map((value) => ({ tripId: t.id!, value })),
              })
            );
        }
        if (t.techniques) {
          tx.push(prisma.tripTechnique.deleteMany({ where: { tripId: t.id } }));
          if (t.techniques.length)
            tx.push(
              prisma.tripTechnique.createMany({
                data: t.techniques.map((value) => ({ tripId: t.id!, value })),
              })
            );
        }
      } else {
        // create
        tx.push(
          prisma.trip.create({
            data: {
              charterId,
              name: t.name || "",
              tripType: t.tripType || "",
              price: t.price || 0,
              durationHours: t.durationHours || 0,
              maxAnglers: t.maxAnglers || 0,
              style:
                t.style &&
                Object.values(CharterStyle).includes(
                  t.style.toUpperCase() as CharterStyle
                )
                  ? (t.style.toUpperCase() as CharterStyle)
                  : CharterStyle.PRIVATE,
              description: t.description || null,
              startTimes: t.startTimes?.length
                ? { create: t.startTimes.map((value) => ({ value })) }
                : undefined,
              species: t.species?.length
                ? { create: t.species.map((value) => ({ value })) }
                : undefined,
              techniques: t.techniques?.length
                ? { create: t.techniques.map((value) => ({ value })) }
                : undefined,
            },
          })
        );
      }
    }
    // Delete removed trips (must delete children first to satisfy FK constraints)
    for (const et of existingTrips) {
      if (!keepIds.has(et.id)) {
        tx.push(prisma.tripStartTime.deleteMany({ where: { tripId: et.id } }));
        tx.push(prisma.tripSpecies.deleteMany({ where: { tripId: et.id } }));
        tx.push(prisma.tripTechnique.deleteMany({ where: { tripId: et.id } }));
        // In case there is trip-scoped media
        tx.push(prisma.charterMedia.deleteMany({ where: { tripId: et.id } }));
        tx.push(prisma.trip.delete({ where: { id: et.id } }));
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
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
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
          kind: true,
          url: true,
          sortOrder: true,
          storageKey: true,
          thumbnailUrl: true,
          durationSeconds: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  // IMPORTANT: use storageKey as the stable identifier (was previously sortOrder string which broke deletion)
  const images = charter.media
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .map((m) => ({ name: m.storageKey, url: m.url }));
  const videos = charter.media
    .filter((m) => m.kind === "CHARTER_VIDEO")
    .map((m) => {
      const meta: {
        thumbnailUrl?: string | null;
        durationSeconds?: number | null;
      } = {
        // Prisma select guarantees these fields exist (possibly undefined)
        thumbnailUrl: (m as unknown as { thumbnailUrl?: string | null })
          .thumbnailUrl,
        durationSeconds: (m as unknown as { durationSeconds?: number | null })
          .durationSeconds,
      };
      return {
        name: m.storageKey,
        url: m.url,
        thumbnailUrl: meta.thumbnailUrl || undefined,
        durationSeconds: meta.durationSeconds || undefined,
      };
    });
  return applySecurityHeaders(
    NextResponse.json({
      charter,
      media: { images, videos, avatar: charter.captain.avatarUrl || null },
    })
  );
}
