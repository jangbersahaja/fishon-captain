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
