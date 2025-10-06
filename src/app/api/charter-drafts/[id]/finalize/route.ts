import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getRequestId } from "@/lib/requestId";
import { withTiming } from "@/lib/requestTiming";
import { diffObjects, writeAuditLog } from "@/server/audit";
import {
  createCharterFromDraftData,
  type FinalizeMediaPayload,
} from "@/server/charters";
import { FinalizeMediaSchema, normalizeFinalizeMedia } from "@/server/media";
import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
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

function getUserRole(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const role = (user as Record<string, unknown>).role;
  return typeof role === "string" ? role : null;
}

// Rate limiting constants
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

// Exported for testing purposes in test environment only
// export { __resetMemoryRateLimiter as __resetFinalizeRateLimiter } from "@/lib/rateLimiter";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  const { id: draftId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const userRole = getUserRole(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // Check for admin override
  const url = new URL(req.url);
  const adminUserId = url.searchParams.get("adminUserId");
  const effectiveUserId =
    userRole === "ADMIN" && adminUserId ? adminUserId : userId;

  // Rate limiting via abstraction
  const rl = await rateLimit({
    key: `finalize:${effectiveUserId}`,
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
  });
  if (!rl.allowed) {
    logger.warn("finalize_rate_limited", {
      userId: effectiveUserId,
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
      where: { id: draftId },
    })
  );

  if (!draft)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  // Check ownership or admin override
  if (userRole !== "ADMIN" && draft.userId !== userId)
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

  // SAFETY NET: Auto-ingest any orphan READY PendingMedia (no charterId, no consumedAt) owned by user
  // that the client may have omitted (e.g., page reload during staging). We only do this on CREATE path
  // (draft.charterId is null) because edit path reuses existing media unless explicitly replaced.
  const orphanPendingImages: { name: string; url: string }[] = [];
  const orphanPendingVideos: { name: string; url: string }[] = [];
  if (!draft.charterId) {
    try {
      const orphans = await prisma.pendingMedia.findMany({
        where: {
          userId,
          status: "READY",
          charterId: null,
          consumedAt: null,
        },
        select: {
          id: true,
          kind: true,
          finalUrl: true,
          finalKey: true,
        },
        take: 50, // guardrail
      });
      for (const o of orphans) {
        if (!o.finalKey || !o.finalUrl) continue;
        if (o.kind === "IMAGE") {
          if (!mediaNormalized?.images.some((m) => m.name === o.finalKey)) {
            orphanPendingImages.push({ name: o.finalKey, url: o.finalUrl });
          }
        } else if (o.kind === "VIDEO") {
          if (!mediaNormalized?.videos.some((m) => m.name === o.finalKey)) {
            orphanPendingVideos.push({ name: o.finalKey, url: o.finalUrl });
          }
        }
      }
      if (orphans.length) {
        // Mark them consumed optimistically; if finalize later fails validation we still keep consumedAt
        // to avoid repeated ingestion loops (user can re-upload if truly lost).
        await prisma.pendingMedia.updateMany({
          where: { id: { in: orphans.map((o) => o.id) } },
          data: { consumedAt: new Date() },
        });
        logger.info("finalize_ingested_orphan_pending", {
          userId,
          draftId: draft.id,
          count: orphans.length,
          imagesAdded: orphanPendingImages.length,
          videosAdded: orphanPendingVideos.length,
          requestId,
        });
      }
    } catch (e) {
      logger.error("finalize_orphan_pending_error", {
        userId,
        draftId: draft.id,
        error: e instanceof Error ? e.message : String(e),
        requestId,
      });
    }
  }

  if (!draft.charterId && media) {
    if (orphanPendingImages.length) {
      media.images.push(...orphanPendingImages);
    }
    if (orphanPendingVideos.length) {
      media.videos.push(...orphanPendingVideos);
    }
  }

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

  // Audit AFTER successful finalize (create path only)
  if (!draft.charterId) {
    try {
      const afterSnapshot = await prisma.charter.findUnique({
        where: { id: result.charterId },
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
        writeAuditLog({
          actorUserId: userId,
          entityType: "charter",
          entityId: result.charterId,
          action: "finalize_create",
          after: afterSnapshot,
          changed: diffObjects(undefined, afterSnapshot),
          correlationId: requestId,
        }).catch(() => {});
      }
    } catch {
      /* swallow */
    }
  }

  return applySecurityHeaders(
    NextResponse.json({ ok: true, charterId: result.charterId, requestId })
  );
}
