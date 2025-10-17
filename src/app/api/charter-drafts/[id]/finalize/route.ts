import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getRequestId } from "@/lib/requestId";
import { withTiming } from "@/lib/requestTiming";
import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import { CharterPricingPlan, CharterStyle, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
// import { createCharterFromDraftData } from "@/server/charters";

import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const requestId = getRequestId(req);
  const draftId = params.id;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    logger.warn("finalize_unauthorized", { requestId, draftId });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );
  }
  const userId = session.user.id;
  // Rate limit: 5 finalize attempts per minute per user
  const rl = await rateLimit({
    key: `finalize:${userId}`,
    windowMs: 60_000,
    max: 5,
  });
  if (!rl.allowed) {
    logger.warn("finalize_rate_limited", {
      requestId,
      draftId,
      userId,
      remaining: rl.remaining,
    });
    counter("finalize.rate_limited").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "rate_limited", requestId }, { status: 429 })
    );
  }
  logger.info("finalize_attempt", { requestId, draftId, userId });
  const draft = await withTiming("finalize_fetchDraft", () =>
    prisma.charterDraft.findUnique({ where: { id: draftId } })
  );
  if (!draft) {
    logger.warn("finalize_draft_not_found", { requestId, draftId, userId });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );
  }
  let draftData: DraftValues | null = null;
  try {
    draftData = draft.data as DraftValues;
  } catch {
    draftData = null;
  }
  if (!draftData) {
    logger.warn("finalize_invalid_draft_data", { requestId, draftId, userId });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_draft_data", requestId },
        { status: 400 }
      )
    );
  }
  const captainProfile = await prisma.captainProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!captainProfile) {
    logger.warn("finalize_missing_captain_profile", {

  const mediaNormalized = normalizeFinalizeMedia(parsed.data.media);
  const media: FinalizeMediaPayload | null = mediaNormalized
    ? {
        images: mediaNormalized.images,
        videos: mediaNormalized.videos,
        imagesOrder: mediaNormalized.imagesOrder,
        videosOrder: mediaNormalized.videosOrder,
        imagesCoverIndex: mediaNormalized.imagesCoverIndex,
        videosCoverIndex: mediaNormalized.videosCoverIndex,
        avatar: mediaNormalized.avatar,
      }
    : null;
  // forcing the user to re-upload.

  // ...existing code...

  let result:
    | { ok: true; charterId: string }
    | { ok: false; errors: Record<string, string> };

  if (draft.charterId) {
    // Update existing charter instead of creating a new one.
    result = await withTiming(
      "finalize_updateExisting",
      async (): Promise<
        | { ok: true; charterId: string }
        | { ok: false; errors: Record<string, string> }
      > => {
        try {
          const transformed = draft.data as unknown as DraftValues;
          const existingCharterId = draft.charterId!;
          const incomingImages = media?.images ?? [];
          const incomingVideos = media?.videos ?? [];

          // BEFORE snapshot for audit (broad include mirrors PATCH endpoint)
          const beforeSnapshot = await prisma.charter.findUnique({
            where: { id: existingCharterId },
            include: {
              boat: true,
              amenities: true,
              features: true,
              policies: true,
              pickup: { include: { areas: true } },
              trips: {
                include: { startTimes: true, species: true, techniques: true },
              },
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

          const updated = await prisma.$transaction(async (tx) => {
            // Fetch charter including current media for reuse decision & auth
            const existing = await tx.charter.findUnique({
              where: { id: existingCharterId },
              select: {
                captainId: true,
                boatId: true,
                id: true,
                media: { select: { id: true, kind: true } },
              },
            });
            if (!existing) throw new Error("forbidden");
            const captainProfile = await tx.captainProfile.findUnique({
              where: { id: existing.captainId },
              select: { userId: true },
            });
            if (!captainProfile || captainProfile.userId !== userId)
              throw new Error("forbidden");

            const existingPhotoCount = existing.media.filter(
              (m) => m.kind === "CHARTER_PHOTO"
            ).length;
            const reuseExistingMedia =
              incomingImages.length === 0 && incomingVideos.length === 0;

            if (!reuseExistingMedia && incomingImages.length === 0) {
              throw new Error("missing_media");
            }
            if (reuseExistingMedia && existingPhotoCount < 3) {
              throw new Error("missing_media");
            }

            await tx.captainProfile.update({
              where: { userId },
              data: {
                displayName: transformed.operator.displayName,
                phone: transformed.operator.phone,
                bio: transformed.operator.bio ?? "",
                experienceYrs: Number.isFinite(
                  transformed.operator.experienceYears
                )
                  ? (transformed.operator.experienceYears as number)
                  : 0,
              },
            });

            if (existing.boatId) {
              await tx.boat.update({
                where: { id: existing.boatId },
                data: {
                  name: transformed.boat.name,
                  type: transformed.boat.type,
                  lengthFt: Number.isFinite(transformed.boat.lengthFeet)
                    ? Math.trunc(transformed.boat.lengthFeet as number)
                    : 0,
                  capacity: Number.isFinite(transformed.boat.capacity)
                    ? Math.trunc(transformed.boat.capacity as number)
                    : 1,
                },
              });
            }

            await tx.charterAmenity.deleteMany({
              where: { charterId: existingCharterId },
            });
            await tx.charterFeature.deleteMany({
              where: { charterId: existingCharterId },
            });
            await tx.policies.deleteMany({
              where: { charterId: existingCharterId },
            });
            const existingPickup = await tx.pickup.findUnique({
              where: { charterId: existingCharterId },
              select: { id: true },
            });
            if (existingPickup) {
              await tx.pickupArea.deleteMany({
                where: { pickupId: existingPickup.id },
              });
              await tx.pickup.delete({
                where: { charterId: existingCharterId },
              });
            }
            {
              const existingTrips = await tx.trip.findMany({
                where: { charterId: existingCharterId },
                select: { id: true },
              });
              const tripIds = existingTrips.map((t) => t.id);
              if (tripIds.length) {
                await tx.charterMedia.deleteMany({
                  where: { tripId: { in: tripIds } },
                });
                await tx.tripStartTime.deleteMany({
                  where: { tripId: { in: tripIds } },
                });
                await tx.tripSpecies.deleteMany({
                  where: { tripId: { in: tripIds } },
                });
                await tx.tripTechnique.deleteMany({
                  where: { tripId: { in: tripIds } },
                });
              }
              await tx.trip.deleteMany({
                where: { charterId: existingCharterId },
              });
            }
            if (!reuseExistingMedia) {
              await tx.charterMedia.deleteMany({
                where: { charterId: existingCharterId },
              });
            }

            await tx.charter.update({
              where: { id: existingCharterId },
              data: {
                charterType: transformed.charterType,
                name: transformed.charterName,
                state: transformed.state,
                city: transformed.city,
                startingPoint: transformed.startingPoint,
                postcode: transformed.postcode,
                latitude:
                  typeof transformed.latitude === "number" &&
                  Number.isFinite(transformed.latitude)
                    ? new Prisma.Decimal(transformed.latitude)
                    : undefined,
                longitude:
                  typeof transformed.longitude === "number" &&
                  Number.isFinite(transformed.longitude)
                    ? new Prisma.Decimal(transformed.longitude)
                    : undefined,
                description: transformed.description ?? "",
                amenities: {
                  create: (transformed.amenities ?? []).map((label) => ({
                    label,
                  })),
                },
                features: {
                  create: (transformed.boat.features ?? []).map((label) => ({
                    label,
                  })),
                },
                pickup: transformed.pickup?.available
                  ? {
                      create: {
                        available: true,
                        fee:
                          typeof transformed.pickup.fee === "number" &&
                          Number.isFinite(transformed.pickup.fee)
                            ? new Prisma.Decimal(transformed.pickup.fee)
                            : undefined,
                        notes: transformed.pickup.notes ?? null,
                        areas: {
                          create: (transformed.pickup.areas ?? []).map(
                            (label) => ({
                              label,
                            })
                          ),
                        },
                      },
                    }
                  : undefined,
                policies: {
                  create: {
                    licenseProvided:
                      transformed.policies.licenseProvided ?? false,
                    catchAndKeep: transformed.policies.catchAndKeep ?? false,
                    catchAndRelease:
                      transformed.policies.catchAndRelease ?? false,
                    childFriendly: transformed.policies.childFriendly ?? false,
                    liveBaitProvided:
                      transformed.policies.liveBaitProvided ?? false,
                    alcoholNotAllowed:
                      transformed.policies.alcoholNotAllowed ?? false,
                    smokingNotAllowed:
                      transformed.policies.smokingNotAllowed ?? false,
                  },
                },
                trips: {
                  create: transformed.trips.map((t, index) => ({
                    name: t.name ?? `Trip ${index + 1}`,
                    tripType: t.tripType || `custom-${index + 1}`,
                    price: new Prisma.Decimal(
                      Number.isFinite(t.price) ? (t.price as number) : 0
                    ),
                    durationHours: Number.isFinite(t.durationHours)
                      ? (t.durationHours as number)
                      : 0,
                    maxAnglers: Number.isFinite(t.maxAnglers)
                      ? (t.maxAnglers as number)
                      : 1,
                    style: t.charterStyle === "shared" ? "SHARED" : "PRIVATE",
                    description: t.description || null,
                    startTimes: {
                      create: (t.startTimes || []).map((value) => ({ value })),
                    },
                    species: {
                      create: (t.species || []).map((value) => ({
                        value,
                      })),
                    },
                    techniques: {
                      create: (t.techniques || []).map((value) => ({ value })),
                    },
                  })),
                },
                ...(reuseExistingMedia
                  ? {}
                  : {
                      media: {
                        create: [
                          ...incomingImages.map((m, i) => ({
                            kind: "CHARTER_PHOTO" as const,
                            url: m.url,
                            storageKey: m.name,
                            sortOrder: i,
                          })),
                          ...incomingVideos.map((m, i) => ({
                            kind: "CHARTER_VIDEO" as const,
                            url: m.url,
                            storageKey: m.name,
                            sortOrder: i,
                          })),
                        ],
                      },
                    }),
              },
            });
            return { charterId: existingCharterId };
          });

          // AFTER snapshot for audit
          const afterSnapshot = await prisma.charter.findUnique({
            where: { id: existingCharterId },
            include: {
              boat: true,
              amenities: true,
              features: true,
              policies: true,
              pickup: { include: { areas: true } },
              trips: {
                include: { startTimes: true, species: true, techniques: true },
              },
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
              entityId: existingCharterId,
              action: "finalize_update",
              before: beforeSnapshot || undefined,
              after: afterSnapshot,
              changed: changedTop,
              correlationId: requestId,
            }).catch(() => {});
          }

          return { ok: true as const, charterId: updated.charterId };
        } catch (e) {
          if (e instanceof Error && e.message === "missing_media") {
            return {
              ok: false as const,
              errors: { images: "At least 3 photos required" } as Record<
                string,
                string
              >,
            };
          }
          if (e instanceof Error && e.message === "forbidden") {
            return {
              ok: false as const,
              errors: { auth: "Not authorized to edit this charter" } as Record<
                string,
                string
              >,
            };
          }
          const msg = e instanceof Error ? e.message : String(e);
          logger.error("finalize_update_exception", {
            error: msg,
            userId,
            draftId: draft.id,
            requestId,
          });
          return {
            ok: false as const,
            errors: { server: "Update failed" } as Record<string, string>,
          };
        }
      }
    );
  } else {
    // Create path still requires new media
    if (!media || media.images.length === 0) {
      logger.info("finalize_missing_media_create", {
        userId,
        draftId: draft.id,
        requestId,
      });
      counter("finalize.missing_media").inc();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "missing_media", requestId },
          { status: 400 }
        )
      );
    }
    result = await withTiming("finalize_transformAndCreate", () =>
      createCharterFromDraftData({
        userId,
        draft: draft.data as unknown as DraftValues,
        media,
      })
    );
  }
  if (!result.ok) {
    logger.info("finalize_validation_failed", {
      userId,
      draftId: draft.id,
      errors: result.errors,
      requestId,
      draftId,
      userId,
    });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json(
        { error: "missing_captain_profile", requestId },
        { status: 400 }
      )
    );
  }
  const canonicalPhotos = await prisma.charterMedia.findMany({
    where: {
      kind: "CHARTER_PHOTO",
      captainId: captainProfile.id,
      OR: [{ charterId: null }, { charterId: { startsWith: "temp-" } }],
    },
    orderBy: { createdAt: "asc" },
  });
  const canonicalVideos = await prisma.captainVideo.findMany({
    where: {
      ownerId: userId,
      charterId: null,
    },
    orderBy: { createdAt: "asc" },
  });
  // Build charterCreateData in two steps to avoid Prisma type errors
  const charterCreateDataBase = {
    captainId: captainProfile.id,
    charterType: draftData.charterType ?? "",
    name: draftData.charterName ?? "",
    state: draftData.state ?? "",
    city: draftData.city ?? "",
    startingPoint: draftData.startingPoint ?? "",
    postcode: draftData.postcode ?? "",
    latitude:
      typeof draftData.latitude === "number" &&
      Number.isFinite(draftData.latitude)
        ? new Prisma.Decimal(draftData.latitude)
        : undefined,
    longitude:
      typeof draftData.longitude === "number" &&
      Number.isFinite(draftData.longitude)
        ? new Prisma.Decimal(draftData.longitude)
        : undefined,
    description: draftData.description ?? "",
    pricingPlan: CharterPricingPlan.BASIC,
    amenities: {
      create: (draftData.amenities ?? []).map((label: string) => ({ label })),
    },
    features: {
      create: (draftData.boat?.features ?? []).map((label: string) => ({
        label,
      })),
    },
    pickup: draftData.pickup?.available
      ? {
          create: {
            available: true,
            fee:
              typeof draftData.pickup.fee === "number" &&
              Number.isFinite(draftData.pickup.fee)
                ? new Prisma.Decimal(draftData.pickup.fee)
                : undefined,
            notes: draftData.pickup.notes ?? null,
            areas: {
              create: (draftData.pickup.areas ?? []).map((label: string) => ({
                label,
              })),
            },
          },
        }
      : undefined,
    policies: {
      create: {
        licenseProvided: draftData.policies?.licenseProvided ?? false,
        catchAndKeep: draftData.policies?.catchAndKeep ?? false,
        catchAndRelease: draftData.policies?.catchAndRelease ?? false,
        childFriendly: draftData.policies?.childFriendly ?? false,
        liveBaitProvided: draftData.policies?.liveBaitProvided ?? false,
        alcoholNotAllowed: draftData.policies?.alcoholNotAllowed ?? false,
        smokingNotAllowed: draftData.policies?.smokingNotAllowed ?? false,
      },
    },
    trips: {
      create: (draftData.trips ?? []).map(
        (t: DraftValues["trips"][number], index: number) => ({
          name: t.name ?? `Trip ${index + 1}`,
          tripType: t.tripType ?? `custom-${index + 1}`,
          price:
            typeof t.price === "number" && Number.isFinite(t.price)
              ? new Prisma.Decimal(t.price)
              : new Prisma.Decimal(0),
          promoPrice:
            t.promoPrice !== undefined &&
            t.promoPrice !== null &&
            Number.isFinite(t.promoPrice)
              ? new Prisma.Decimal(t.promoPrice)
              : undefined,
          durationHours: Number.isFinite(t.durationHours) ? t.durationHours : 0,
          maxAnglers: Number.isFinite(t.maxAnglers) ? t.maxAnglers : 1,
          style:
            t.charterStyle === "private"
              ? CharterStyle.PRIVATE
              : CharterStyle.SHARED,
          description: t.description ?? null,
          startTimes: {
            create: (t.startTimes ?? []).map((value: string) => ({ value })),
          },
          species: {
            create: (t.species ?? []).map((value: string) => ({ value })),
          },
          techniques: {
            create: (t.techniques ?? []).map((value: string) => ({ value })),
          },
        })
      ),
    },
  };
  let charterCreateData = charterCreateDataBase;
  if (draftData.boat && typeof draftData.boat.name === "string") {
    charterCreateData = Object.assign({}, charterCreateDataBase, {
      boat: {
        create: {
          name: draftData.boat.name ?? "",
          type: draftData.boat.type ?? "",
          lengthFt:
            typeof draftData.boat.lengthFeet === "number" &&
            Number.isFinite(draftData.boat.lengthFeet)
              ? Math.trunc(draftData.boat.lengthFeet)
              : 0,
          capacity:
            typeof draftData.boat.capacity === "number" &&
            Number.isFinite(draftData.boat.capacity)
              ? Math.trunc(draftData.boat.capacity)
              : 1,
        },
      },
    });
  }
  let charter: { id: string };
  try {
    charter = await withTiming("finalize_createCharter", () =>
      prisma.charter.create({
        data: charterCreateData,
        select: { id: true },
      })
    );
  } catch (e: unknown) {
    logger.error("finalize_charter_create_failed", {
      requestId,
      draftId,
      userId,
      error: e instanceof Error ? e.message : String(e),
    });
    counter("finalize.error").inc();
    throw e;
  }
  await withTiming("finalize_updateCharterMedia", () =>
    prisma.charterMedia.updateMany({
      where: { id: { in: canonicalPhotos.map((p) => p.id) } },
      data: { charterId: charter.id },
    })
  );
  for (const [i, video] of canonicalVideos.entries()) {
    const charterMedia = await prisma.charterMedia.create({
      data: {
        charterId: charter.id,
        captainId: captainProfile.id,
        kind: "CHARTER_VIDEO",
        url: video.ready720pUrl || video.originalUrl,
        storageKey:
          video.blobKey || video.normalizedBlobKey || video.originalUrl,
        sortOrder: i,
      },
    });
    await prisma.captainVideo.update({
      where: { id: video.id },
      data: { charterId: charter.id, charterMediaId: charterMedia.id },
    });
  }
  await withTiming("finalize_updateDraftStatus", () =>
    prisma.charterDraft.update({
      where: { id: draft.id },
      data: { status: "SUBMITTED", charterId: charter.id },
    })
  );
  logger.info("finalize_success", {
    requestId,
    draftId,
    userId,
    charterId: charter.id,
  });
  counter("finalize.success").inc();
  return applySecurityHeaders(
    NextResponse.json({ ok: true, charterId: charter.id, requestId })
  );
}
