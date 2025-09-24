import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getRequestId } from "@/lib/requestId";
import { withTiming } from "@/lib/requestTiming";
import {
  createCharterFromDraftData,
  type FinalizeMediaPayload,
} from "@/server/charters";
import { FinalizeMediaSchema, normalizeFinalizeMedia } from "@/server/media";
import type { DraftValues } from "@features/charter-form/charterForm.draft";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Reuse centralized media schema
const FinalizePayloadSchema = FinalizeMediaSchema;

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

// Rate limiting constants
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

export { __resetMemoryRateLimiter as __resetFinalizeRateLimiter } from "@/lib/rateLimiter";

export async function POST(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  const paramsValue: { id: string } =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // Rate limiting via abstraction
  const rl = await rateLimit({
    key: `finalize:${userId}`,
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
  });
  if (!rl.allowed) {
    logger.warn("finalize_rate_limited", {
      userId,
      remaining: rl.remaining,
      requestId,
    });
    counter("finalize.rate_limited").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "rate_limited", requestId }, { status: 429 })
    );
  }

  const draft = await withTiming("finalize_fetchDraft", () =>
    prisma.charterDraft.findUnique({
      where: { id: paramsValue.id },
    })
  );
  if (!draft || draft.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );
  if (draft.status !== "DRAFT") {
    // Idempotent finalize: if already submitted and has charterId, return success
    if (draft.status === "SUBMITTED" && draft.charterId) {
      return applySecurityHeaders(
        NextResponse.json({ ok: true, charterId: draft.charterId, requestId })
      );
    }
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_status", requestId }, { status: 400 })
    );
  }

  // Optimistic version check: client should send x-draft-version header
  const clientVersionHeader = req.headers.get("x-draft-version");
  if (clientVersionHeader) {
    const clientVersion = Number(clientVersionHeader);
    if (!Number.isNaN(clientVersion) && clientVersion !== draft.version) {
      logger.info("finalize_version_conflict", {
        userId,
        draftId: draft.id,
        clientVersion,
        serverVersion: draft.version,
        requestId,
      });
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "version_conflict",
            server: { version: draft.version, updatedAt: draft.updatedAt },
            requestId,
          },
          { status: 409 }
        )
      );
    }
  }

  const body = await req.json().catch(() => null);
  if (!body)
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json", requestId }, { status: 400 })
    );
  const parsed = FinalizePayloadSchema.safeParse(body);
  if (!parsed.success) {
    counter("finalize.invalid_payload").inc();
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "invalid_payload",
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
          requestId,
        },
        { status: 400 }
      )
    );
  }

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
          const updated = await prisma.$transaction(async (tx) => {
            // Fetch charter including current media for reuse decision
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
              // Disallow updating to zero images (must keep >=3 or reuse).
              throw new Error("missing_media");
            }
            if (reuseExistingMedia && existingPhotoCount < 3) {
              // Can't reuse because existing charter itself has insufficient media (data integrity guard)
              throw new Error("missing_media");
            }

            // Update captain basics
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

            // Update boat
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

            // Replace nested relation sets (except media if reusing)
            await tx.charterAmenity.deleteMany({
              where: { charterId: existingCharterId },
            });
            await tx.charterFeature.deleteMany({
              where: { charterId: existingCharterId },
            });
            await tx.policies.deleteMany({
              where: { charterId: existingCharterId },
            });
            // Pickup has dependent PickupArea rows; delete areas first then pickup to avoid FK constraint errors.
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
            // Trip child relations (startTimes, species, techniques, trip media) must be cleared before trips.
            {
              const existingTrips = await tx.trip.findMany({
                where: { charterId: existingCharterId },
                select: { id: true },
              });
              const tripIds = existingTrips.map((t) => t.id);
              if (tripIds.length) {
                // Always clear trip-scoped media (even if reusing charter-level media) because trips are recreated.
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
                    licenseProvided: transformed.policies.licenseProvided,
                    catchAndKeep: transformed.policies.catchAndKeep,
                    catchAndRelease: transformed.policies.catchAndRelease,
                    childFriendly: transformed.policies.childFriendly,
                    liveBaitProvided: transformed.policies.liveBaitProvided,
                    alcoholNotAllowed: transformed.policies.alcoholNotAllowed,
                    smokingNotAllowed: transformed.policies.smokingNotAllowed,
                  },
                },
                trips: {
                  create: transformed.trips.map((t, index) => ({
                    name: t.name,
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
                      create: (t.targetSpecies || []).map((value) => ({
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
    });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json(
        { error: "validation", errors: result.errors, requestId },
        { status: 400 }
      )
    );
  }

  // Mark draft submitted + link charterId
  await withTiming("finalize_markSubmitted", () =>
    prisma.charterDraft.update({
      where: { id: draft.id },
      data: { status: "SUBMITTED", charterId: result.charterId },
    })
  );

  logger.info("finalize_success", {
    userId,
    draftId: draft.id,
    charterId: result.charterId,
    requestId,
  });
  counter("finalize.success").inc();

  return applySecurityHeaders(
    NextResponse.json({ ok: true, charterId: result.charterId, requestId })
  );
}
