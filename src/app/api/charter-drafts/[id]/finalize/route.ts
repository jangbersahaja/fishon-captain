import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getRequestId } from "@/lib/requestId";
import { sendCharterRegistration } from "@/lib/services/email-service";
// update-path auditing removed; no longer importing audit helpers here
import type { DraftValues } from "@features/charter-onboarding/charterForm.draft";
import { CharterPricingPlan, CharterStyle, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
// import { createCharterFromDraftData } from "@/server/charters";

import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request);
  const params = await context.params;
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
  // Parse media from request body for both create and update paths
  let media: {
    images: Array<{ url: string; name: string }>;
    videos: Array<{ url: string; name: string }>;
  } | null = null;
  try {
    const body = await request.json();
    media = body.media ?? null;
  } catch {
    media = null;
  }

  // Transactional finalize logic
  let charterId: string | null = null;
  let charterName: string | null = null;
  let captainEmail: string | null = null;
  let captainName: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // Fetch draft and captainProfile inside transaction
      const draft = await tx.charterDraft.findUnique({
        where: { id: draftId },
      });
      if (!draft) {
        throw { status: 404, error: "not_found" };
      }
      if (draft.charterId || draft.status !== "DRAFT") {
        throw {
          status: 409,
          error: "already_submitted",
          message:
            "This draft has already created a charter. Use /api/charters/[id] to edit.",
        };
      }
      let draftData: DraftValues | null = null;
      try {
        draftData = draft.data as DraftValues;
      } catch {
        draftData = null;
      }
      if (!draftData) {
        throw { status: 400, error: "invalid_draft_data" };
      }

      // Capture charter name for email
      charterName = draftData.charterName ?? null;

      const captainProfile = await tx.captainProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          displayName: true,
          user: { select: { email: true } },
        },
      });
      if (!captainProfile) {
        throw { status: 400, error: "missing_captain_profile" };
      }

      // Capture captain info for email
      captainEmail = captainProfile.user?.email ?? null;
      captainName = captainProfile.displayName ?? null;
      if (!media || media.images.length === 0) {
        throw { status: 400, error: "missing_media" };
      }
      // All CharterMedia are photos now - no need to filter by kind
      const canonicalPhotos = await tx.charterMedia.findMany({
        where: {
          captainId: captainProfile.id,
          OR: [{ charterId: null }, { charterId: { startsWith: "temp-" } }],
        },
        orderBy: { createdAt: "asc" },
      });
      // Query unlinked videos (charterId: null)
      // Note: Videos uploaded during draft editing with charterId may already have
      // CharterVideo junction records. Those will be handled separately.
      const canonicalVideos = await tx.captainVideo.findMany({
        where: {
          captainId: captainProfile.id,
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
        backupPhone: draftData.operator?.backupPhone ?? null,
        pricingPlan: CharterPricingPlan.BASIC,
        amenities: {
          create: (draftData.amenities ?? []).map((label: string) => ({
            label,
          })),
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
                  create: (draftData.pickup.areas ?? []).map(
                    (label: string) => ({
                      label,
                    })
                  ),
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
              durationHours: Number.isFinite(t.durationHours)
                ? t.durationHours
                : 0,
              maxAnglers: Number.isFinite(t.maxAnglers) ? t.maxAnglers : 1,
              style:
                t.charterStyle === "private"
                  ? CharterStyle.PRIVATE
                  : CharterStyle.SHARED,
              description: t.description ?? null,
              startTimes: {
                create: (t.startTimes ?? []).map((value: string) => ({
                  value,
                })),
              },
              species: {
                create: (t.species ?? []).map((value: string) => ({ value })),
              },
              techniques: {
                create: (t.techniques ?? []).map((value: string) => ({
                  value,
                })),
              },
            })
          ),
        },
      };
      let charterCreateData = charterCreateDataBase;
      if (draftData.boat && typeof draftData.boat.name === "string") {
        // Create Boat first, then use boatId in Charter
        const boatRecord = await tx.boat.create({
          data: {
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
          select: { id: true },
        });
        charterCreateData = Object.assign({}, charterCreateDataBase, {
          boatId: boatRecord.id,
        });
      }
      const charter = await tx.charter.create({
        data: charterCreateData,
        select: { id: true },
      });
      charterId = charter.id;

      // Create charter schedule
      await tx.charterSchedule.create({
        data: {
          charterId: charter.id,
          scheduleType: draftData.scheduleType || "EVERYDAY",
          operationalDays: draftData.operationalDays || [],
        },
      });

      await tx.charterMedia.updateMany({
        where: { id: { in: canonicalPhotos.map((p) => p.id) } },
        data: { charterId: charter.id },
      });

      // Link videos via CharterVideo junction table (many-to-many)
      // This replaces the old direct FK update approach

      // Check for videos already linked during draft editing
      // (e.g., if user uploaded videos with draftId or temp charterId)
      const existingVideoLinks = await tx.charterVideo.findMany({
        where: {
          OR: [
            { charterId: draft.id }, // Draft ID used as temp charter ID
            { charterId: { startsWith: "temp-" } }, // Any temp IDs
          ],
        },
        include: {
          video: {
            select: { captainId: true },
          },
        },
      });

      // Filter to only this captain's videos
      const validExistingLinks = existingVideoLinks.filter(
        (link) => link.video.captainId === captainProfile.id
      );

      // Update existing junction records with real charter ID
      if (validExistingLinks.length > 0) {
        await tx.charterVideo.updateMany({
          where: {
            id: { in: validExistingLinks.map((link) => link.id) },
          },
          data: { charterId: charter.id },
        });
      }

      // Get the current max order from existing links
      const maxOrder =
        validExistingLinks.length > 0
          ? Math.max(...validExistingLinks.map((link) => link.order))
          : -1;

      // Create junction records for newly discovered unlinked videos
      if (canonicalVideos.length > 0) {
        await tx.charterVideo.createMany({
          data: canonicalVideos.map((video, index) => ({
            charterId: charter.id,
            videoId: video.id,
            order: maxOrder + 1 + index, // Continue from existing max order
          })),
          skipDuplicates: true, // Prevent duplicates if video already linked
        });
      }

      await tx.charterDraft.update({
        where: { id: draft.id },
        data: { status: "SUBMITTED", charterId: charter.id },
      });
    });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      const e = err as { status: number; error?: string; message?: string };
      logger.info("finalize_blocked_or_failed", {
        requestId,
        draftId,
        userId,
        error: e.error,
        message: e.message,
      });
      counter("finalize.blocked").inc();
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: e.error,
            message: e.message,
            requestId,
          },
          { status: e.status }
        )
      );
    }
    logger.error("finalize_transaction_failed", {
      requestId,
      draftId,
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    counter("finalize.error").inc();
    return applySecurityHeaders(
      NextResponse.json(
        { error: "transaction_failed", requestId },
        { status: 500 }
      )
    );
  }
  logger.info("finalize_success", {
    requestId,
    draftId,
    userId,
    charterId,
  });
  counter("finalize.success").inc();

  // Send charter registration email (async, non-blocking)
  if (captainEmail && charterName && captainName) {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://fishon-captain.vercel.app"}/captain/charters/${charterId}`;
    sendCharterRegistration({
      to: captainEmail,
      captainName,
      charterName,
      dashboardUrl,
      ccAdmin: process.env.ADMIN_EMAIL, // Optional CC to admin
    }).catch((err) => {
      logger.error("charter_registration_email_failed", {
        requestId,
        charterId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return applySecurityHeaders(
    NextResponse.json({ ok: true, charterId, requestId })
  );
}
