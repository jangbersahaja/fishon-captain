import { prisma } from "@/lib/prisma";
import type { DraftValues } from "@features/charter-form/charterForm.draft";
import {
  CharterPricingPlan,
  CharterStyle,
  MediaKind,
  Prisma,
} from "@prisma/client";

export type FinalizeMediaPayload = {
  images: Array<{ name: string; url: string }>;
  videos: Array<{ name: string; url: string }>;
  imagesOrder?: number[];
  videosOrder?: number[];
  imagesCoverIndex?: number;
  videosCoverIndex?: number;
  avatar?: { name: string; url: string } | null;
};

export type FinalizeValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export function validateDraftForFinalize(
  draft: DraftValues,
  media: FinalizeMediaPayload
): FinalizeValidationResult {
  const errors: Record<string, string> = {};
  if (!draft.operator?.displayName?.trim())
    errors.operatorDisplayName = "Display name required";
  if (!draft.operator?.phone?.trim()) errors.operatorPhone = "Phone required";
  if (!draft.charterType?.trim()) errors.charterType = "Charter type required";
  if (!draft.charterName?.trim()) errors.charterName = "Charter name required";
  if (!draft.state?.trim()) errors.state = "State required";
  if (!draft.city?.trim()) errors.city = "City required";
  if (!draft.startingPoint?.trim())
    errors.startingPoint = "Starting point required";
  if (!draft.postcode?.toString()?.trim())
    errors.postcode = "Postcode required";
  if (!Array.isArray(draft.trips) || !draft.trips.length)
    errors.trips = "At least one trip";
  if (!Array.isArray(draft.amenities) || !draft.amenities.length)
    errors.amenities = "At least one amenity";
  if (!media.images || media.images.length < 3)
    errors.images = "At least 3 photos";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true };
}

function toDecimal(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Prisma.Decimal(value);
  }
  return new Prisma.Decimal(0);
}

function normalizeOrder<T>(arr: T[], order?: number[]) {
  if (!order || !order.length || order.length !== arr.length) return arr;
  const uniq = new Set(order);
  const ok =
    uniq.size === order.length &&
    Math.min(...order) === 0 &&
    Math.max(...order) === order.length - 1;
  if (!ok) return arr;
  return order.map((i) => arr[i]);
}

function moveIndexToFront<T>(arr: T[], idx: number | undefined) {
  if (idx === undefined || idx === null) return arr;
  if (idx <= 0 || idx >= arr.length) return arr;
  const copy = [...arr];
  const [chosen] = copy.splice(idx, 1);
  copy.unshift(chosen);
  return copy;
}

export async function createCharterFromDraftData(params: {
  userId: string;
  draft: DraftValues;
  media: FinalizeMediaPayload;
}) {
  const { userId, draft, media } = params;
  const validated = validateDraftForFinalize(draft, media);
  if (!validated.ok) return validated;

  const pricingPlan = CharterPricingPlan.BASIC; // future: dynamic

  const imagesOrdered = moveIndexToFront(
    normalizeOrder(media.images, media.imagesOrder),
    media.imagesCoverIndex
  );
  const videosOrdered = moveIndexToFront(
    normalizeOrder(media.videos, media.videosOrder),
    media.videosCoverIndex
  );

  // Ensure a captain profile exists (idempotent)
  const captainProfile = await prisma.captainProfile.upsert({
    where: { userId },
    update: {
      // Retain existing first/last name values if present; we no longer collect them here
      displayName: draft.operator.displayName,
      phone: draft.operator.phone,
      bio: draft.operator.bio ?? "",
      experienceYrs: Number.isFinite(draft.operator.experienceYears)
        ? (draft.operator.experienceYears as number)
        : 0,
      avatarUrl: media.avatar?.url ?? undefined,
    },
    create: {
      userId,
      // Placeholder first/last names until future migration splitting session name
      firstName: draft.operator.displayName?.split(" ")[0] || "Captain",
      lastName: draft.operator.displayName?.split(" ").slice(1).join(" ") || "",
      displayName: draft.operator.displayName,
      phone: draft.operator.phone,
      bio: draft.operator.bio ?? "",
      experienceYrs: Number.isFinite(draft.operator.experienceYears)
        ? (draft.operator.experienceYears as number)
        : 0,
      avatarUrl: media.avatar?.url ?? undefined,
    },
  });

  // Use transaction to create boat + charter + nested records
  const { charter } = await prisma.$transaction(async (tx) => {
    const boatRecord = await tx.boat.create({
      data: {
        name: draft.boat.name,
        type: draft.boat.type,
        lengthFt: Number.isFinite(draft.boat.lengthFeet)
          ? Math.trunc(draft.boat.lengthFeet as number)
          : 0,
        capacity: Number.isFinite(draft.boat.capacity)
          ? Math.trunc(draft.boat.capacity as number)
          : 1,
      },
      select: { id: true },
    });

    const charterRecord = await tx.charter.create({
      data: {
        captainId: captainProfile.id,
        charterType: draft.charterType,
        name: draft.charterName,
        state: draft.state,
        city: draft.city,
        startingPoint: draft.startingPoint,
        postcode: draft.postcode,
        latitude:
          typeof draft.latitude === "number" && Number.isFinite(draft.latitude)
            ? new Prisma.Decimal(draft.latitude)
            : undefined,
        longitude:
          typeof draft.longitude === "number" &&
          Number.isFinite(draft.longitude)
            ? new Prisma.Decimal(draft.longitude)
            : undefined,
        description: draft.description ?? "",
        pricingPlan,
        boatId: boatRecord.id,
        amenities: {
          create: (draft.amenities ?? []).map((label) => ({ label })),
        },
        features: {
          create: (draft.boat.features ?? []).map((label) => ({ label })),
        },
        pickup: draft.pickup?.available
          ? {
              create: {
                available: true,
                fee:
                  typeof draft.pickup.fee === "number" &&
                  Number.isFinite(draft.pickup.fee)
                    ? new Prisma.Decimal(draft.pickup.fee)
                    : undefined,
                notes: draft.pickup.notes ?? null,
                areas: {
                  create: (draft.pickup.areas ?? []).map((label) => ({
                    label,
                  })),
                },
              },
            }
          : undefined,
        policies: {
          create: {
            licenseProvided: draft.policies.licenseProvided,
            catchAndKeep: draft.policies.catchAndKeep,
            catchAndRelease: draft.policies.catchAndRelease,
            childFriendly: draft.policies.childFriendly,
            liveBaitProvided: draft.policies.liveBaitProvided,
            alcoholNotAllowed: draft.policies.alcoholNotAllowed,
            smokingNotAllowed: draft.policies.smokingNotAllowed,
          },
        },
        trips: {
          create: draft.trips.map((t, index) => ({
            name: t.name,
            tripType: t.tripType ?? `custom-${index + 1}`,
            price: toDecimal(t.price),
            durationHours: Number.isFinite(t.durationHours)
              ? (t.durationHours as number)
              : 0,
            maxAnglers: Number.isFinite(t.maxAnglers)
              ? (t.maxAnglers as number)
              : 1,
            style:
              t.charterStyle === "private"
                ? CharterStyle.PRIVATE
                : CharterStyle.SHARED,
            description: t.description ?? null,
            startTimes: {
              create: (t.startTimes ?? []).map((value) => ({ value })),
            },
            species: {
              create: (t.targetSpecies ?? []).map((value) => ({ value })),
            },
            techniques: {
              create: (t.techniques ?? []).map((value) => ({ value })),
            },
          })),
        },
        media: {
          create: [
            ...imagesOrdered.map((m, i) => ({
              kind: MediaKind.CHARTER_PHOTO,
              url: m.url,
              storageKey: m.name,
              sortOrder: i,
            })),
            ...videosOrdered.map((m, i) => ({
              kind: MediaKind.CHARTER_VIDEO,
              url: m.url,
              storageKey: m.name,
              sortOrder: i,
            })),
          ],
        },
      },
      select: { id: true },
    });

    return { charter: charterRecord };
  });

  return { ok: true as const, charterId: charter.id };
}
