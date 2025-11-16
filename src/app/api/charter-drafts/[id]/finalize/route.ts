import { getEffectiveUserId } from "@/lib/adminBypass";
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
  const url = new URL(request.url);
  const adminUserId = url.searchParams.get("adminUserId") || undefined;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId) {
    logger.warn("finalize_unauthorized", { requestId, draftId });
    counter("finalize.validation_failed").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );
  }
  const userId = effectiveUserId;
  // Rate limit: 5 finalize attempts per minute per user (use effective user for rate limiting)
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

      // Phase 2: Charter ownership architecture
      // 1. Get user details for email and role
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true, role: true },
      });
      if (!user) {
        throw { status: 400, error: "user_not_found" };
      }

      // 1.5. Check charter limits based on role (Phase 7: OPERATOR role support)
      // CAPTAIN role can only have 1 charter, OPERATOR can have unlimited
      if (user.role === "CAPTAIN") {
        const existingCharterCount = await tx.charter.count({
          where: { ownerId: userId },
        });
        if (existingCharterCount >= 1) {
          throw {
            status: 403,
            error: "charter_limit_reached",
            message:
              "Captain accounts can only own 1 charter. Upgrade to Operator to manage multiple charters.",
          };
        }
      }

      // 2. Get or create CaptainProfile if user will be a captain
      // For now, we assume owner is also the captain (Phase 3 will add crew management)
      let captainProfile = await tx.captainProfile.findUnique({
        where: { userId },
        select: { id: true, displayName: true },
      });

      if (!captainProfile && draftData.operator) {
        // Create CaptainProfile with real data from form
        const displayName =
          draftData.operator.displayName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Captain";

        captainProfile = await tx.captainProfile.create({
          data: {
            userId,
            firstName:
              user.firstName ||
              draftData.operator.displayName?.split(" ")[0] ||
              "Captain",
            lastName:
              user.lastName ||
              draftData.operator.displayName?.split(" ").slice(1).join(" ") ||
              "",
            displayName,
            phone: draftData.operator.phone || "",
            bio: draftData.operator.bio || "",
            experienceYrs:
              typeof draftData.operator.experienceYears === "number" &&
              Number.isFinite(draftData.operator.experienceYears)
                ? Math.max(0, Math.trunc(draftData.operator.experienceYears))
                : 0,
            avatarUrl: draftData.operator.avatarUrl || undefined,
          },
          select: { id: true, displayName: true },
        });
      } else if (captainProfile && draftData.operator) {
        // Update existing CaptainProfile with operator data from draft
        const updateData: {
          displayName?: string;
          bio?: string;
          experienceYrs?: number;
          phone?: string;
          avatarUrl?: string;
          firstName?: string;
          lastName?: string;
        } = {};

        // Only update fields that are present in the draft
        if (draftData.operator.displayName) {
          updateData.displayName = draftData.operator.displayName;
        }
        if (draftData.operator.bio) {
          updateData.bio = draftData.operator.bio;
        }
        if (
          typeof draftData.operator.experienceYears === "number" &&
          Number.isFinite(draftData.operator.experienceYears)
        ) {
          updateData.experienceYrs = Math.max(
            0,
            Math.trunc(draftData.operator.experienceYears)
          );
        }
        if (draftData.operator.phone) {
          updateData.phone = draftData.operator.phone;
        }
        if (draftData.operator.avatarUrl) {
          updateData.avatarUrl = draftData.operator.avatarUrl;
        }

        // Update CaptainProfile if there are changes
        if (Object.keys(updateData).length > 0) {
          await tx.captainProfile.update({
            where: { id: captainProfile.id },
            data: updateData,
          });
        }
      }

      if (!captainProfile) {
        throw { status: 400, error: "missing_captain_profile" };
      }

      // Capture captain info for email
      captainEmail = user.email ?? null;
      captainName =
        draftData.operator?.displayName ?? captainProfile.displayName ?? null;
      if (!media || media.images.length === 0) {
        throw { status: 400, error: "missing_media" };
      }
      // All CharterMedia are photos now - no need to filter by kind
      const canonicalPhotos = await tx.charterMedia.findMany({
        where: {
          ownerId: userId, // Phase 2: Query by ownerId instead of captainId
          OR: [{ charterId: null }, { charterId: { startsWith: "temp-" } }],
        },
        orderBy: { createdAt: "asc" },
      });
      // Query unlinked videos (charterId: null)
      // Note: Videos uploaded during draft editing with charterId may already have
      // CharterVideo junction records. Those will be handled separately.
      const canonicalVideos = await tx.captainVideo.findMany({
        where: {
          ownerId: userId, // Phase 2: Query by ownerId instead of captainId
          charterId: null,
        },
        orderBy: { createdAt: "asc" },
      });
      // Build charterCreateData in two steps to avoid Prisma type errors
      const charterCreateDataBase = {
        ownerId: userId, // Phase 2: Use ownerId instead of captainId
        captainId: captainProfile.id, // Keep for backward compatibility during migration
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

      // Phase 2: Create CharterCaptain assignment (owner is also primary captain)
      await tx.charterCaptain.create({
        data: {
          charterId: charter.id,
          captainId: captainProfile.id,
          isPrimary: true,
          isActive: true,
        },
      });

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
            select: { ownerId: true }, // Phase 2: Query ownerId instead of captainId
          },
        },
      });

      // Filter to only this owner's videos (Phase 2: use ownerId)
      const validExistingLinks = existingVideoLinks.filter(
        (link) => link.video.ownerId === userId
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
