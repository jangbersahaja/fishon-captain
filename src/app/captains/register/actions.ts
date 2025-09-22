"use server";

import { randomUUID } from "node:crypto";

import {
  CharterPricingPlan,
  CharterStyle,
  MediaKind,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { del as blobDel } from "@vercel/blob";

export type Trip = {
  name: string;
  tripType?: string;
  price: number;
  duration: string;
  startTimes: string[];
  maxAnglers: number;
  private: boolean;
  description?: string;
  targetSpecies?: string[];
  techniques?: string[];
};

export type Pickup = {
  available: boolean;
  included: boolean;
  fee?: number;
  areas?: string[];
  notes?: string;
};

export type Policies = {
  catchAndKeep?: boolean;
  catchAndRelease?: boolean;
  childFriendly?: boolean;
  liveBaitProvided?: boolean;
  alcoholAllowed?: boolean;
  smokingAllowed?: boolean;
};

export type Cancellation = {
  freeUntilHours: number;
  afterPolicy?: string;
};

export type Boat = {
  name: string;
  type: string;
  length: string;
  capacity: number;
  features: string[];
};

export type CharterPayload = {
  id?: number;
  operator: {
    firstName: string;
    lastName: string;
    name: string;
    phone: string;
    experienceYears?: number;
    crewCount?: number;
    bio?: string;
    avatar?: { name: string; url: string } | null;
  };
  charterType: string;
  name: string;
  locationState: string;
  locationDistrict: string;
  location: string;
  address: string;
  postcode: string;
  coordinates: { lat: number; lng: number };
  images: Array<{ name: string; url: string }>;
  videos?: Array<{ name: string; url: string }>;
  imagesOrder?: number[];
  videosOrder?: number[];
  imagesCoverIndex?: number;
  videosCoverIndex?: number;
  description: string;
  trip: Trip[];
  species: string[];
  techniques: string[];
  includes: string[];
  excludes: string[];
  licenseProvided: boolean;
  pickup: Pickup;
  policies: Policies;
  cancellation: Cancellation;
  languages: string[];
  boat: Boat;
  pricingModel: string;
};

export async function submitCharter(formData: FormData) {
  const raw = formData.get("payload");
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "Missing payload." };
  }

  let payload: CharterPayload;
  let uploadedPhotoKeys: string[] = [];
  try {
    payload = JSON.parse(raw);
    // Keys of photos uploaded this submit (so we can delete them if submit fails)
    uploadedPhotoKeys = Array.isArray(payload.images)
      ? payload.images.map((i) => i?.name).filter(Boolean)
      : [];
  } catch {
    return { ok: false, error: "Invalid JSON payload." };
  }

  const errors: Record<string, string> = {};
  if (!payload.name?.trim()) errors.name = "Charter name is required.";
  if (!payload.operator?.firstName?.trim())
    errors.operatorFirstName = "First name is required.";
  if (!payload.operator?.lastName?.trim())
    errors.operatorLastName = "Last name is required.";
  if (!payload.operator?.name?.trim())
    errors.operatorName = "Preferred operator name is required.";
  if (!payload.operator?.phone?.trim())
    errors.operatorPhone = "Phone number is required.";
  if (!payload.charterType?.trim())
    errors.charterType = "Select a charter type.";
  if (!payload.location?.trim()) errors.location = "Location is required.";
  if (!payload.locationState?.trim())
    errors.locationState = "State is required.";
  if (!payload.locationDistrict?.trim())
    errors.locationDistrict = "District is required.";
  if (!payload.address?.trim()) errors.address = "Starting point is required.";
  if (!payload.postcode?.trim()) errors.postcode = "Postcode is required.";
  if (
    typeof payload.coordinates?.lat !== "number" ||
    typeof payload.coordinates?.lng !== "number"
  ) {
    errors.coordinates = "Latitude and longitude must be numbers.";
  }
  if (!Array.isArray(payload.trip) || payload.trip.length === 0) {
    errors.trip = "Add at least one trip.";
  }
  if (!Array.isArray(payload.images) || payload.images.length < 3) {
    errors.images = "Upload at least 3 photos.";
  }
  if (Array.isArray(payload.images) && payload.images.length > 15) {
    errors.images = "Maximum 15 photos allowed.";
  }
  if (Array.isArray(payload.videos) && payload.videos.length > 3) {
    errors.videos = "Maximum 3 videos allowed.";
  }
  if (!payload.boat?.name?.trim()) errors.boatName = "Boat name is required.";
  if (!payload.boat?.type?.trim()) errors.boatType = "Boat type is required.";
  if (!payload.boat?.length?.trim())
    errors.boatLength = "Boat length is required.";
  if (!payload.pricingModel?.trim())
    errors.pricingModel = "Select a pricing plan.";

  if (Object.keys(errors).length) {
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token && uploadedPhotoKeys.length) {
        await Promise.allSettled(
          uploadedPhotoKeys.map((k) => blobDel(k, { token }))
        );
      }
    } catch {}
    return { ok: false, errors };
  }

  const pricingPlan = resolvePricingPlan(payload.pricingModel);
  const latitude = toDecimal(payload.coordinates?.lat);
  const longitude = toDecimal(payload.coordinates?.lng);
  const boatLengthFt = parseBoatLength(payload.boat.length) ?? 0;

  try {
    const { charter } = await prisma.$transaction(async (tx) => {
      const provisionalUser = await tx.user.create({
        data: {
          email: `pending-${randomUUID()}@fishon.local`,
          passwordHash: "",
        },
      });

      const captainProfile = await tx.captainProfile.create({
        data: {
          userId: provisionalUser.id,
          firstName: payload.operator.firstName,
          lastName: payload.operator.lastName,
          displayName: payload.operator.name,
          phone: payload.operator.phone,
          bio: payload.operator.bio ?? "",
          experienceYrs: payload.operator.experienceYears ?? 0,
          avatarUrl: payload.operator.avatar?.url ?? null,
        },
      });

      // Create Boat first; Charter holds the foreign key (boatId)
      const boatRecord = await tx.boat.create({
        data: {
          name: payload.boat.name,
          type: payload.boat.type,
          lengthFt: boatLengthFt,
          capacity: payload.boat.capacity,
        },
        select: { id: true },
      });

      // ----- Media ordering & cover normalization (backwards-compatible) -----
      const images = Array.isArray(payload.images) ? [...payload.images] : [];
      const videos = Array.isArray(payload.videos)
        ? [...(payload.videos ?? [])]
        : [];

      const imagesOrder: number[] = Array.isArray(payload.imagesOrder)
        ? payload.imagesOrder
        : [];
      const videosOrder: number[] = Array.isArray(payload.videosOrder)
        ? payload.videosOrder
        : [];

      const imagesCoverIndex: number =
        typeof payload.imagesCoverIndex === "number"
          ? payload.imagesCoverIndex
          : 0;
      const videosCoverIndex: number =
        typeof payload.videosCoverIndex === "number"
          ? payload.videosCoverIndex
          : 0;

      const applyOrder = <T>(arr: T[], order: number[]) => {
        if (!order.length || order.length !== arr.length) return arr;
        const uniq = new Set(order);
        const ok =
          uniq.size === order.length &&
          Math.min(...order) === 0 &&
          Math.max(...order) === order.length - 1;
        if (!ok) return arr;
        return order.map((i) => arr[i]);
      };

      const moveIndexToFront = <T>(arr: T[], k: number) => {
        if (k <= 0 || k >= arr.length) return arr;
        const copy = [...arr];
        const [chosen] = copy.splice(k, 1);
        copy.unshift(chosen);
        return copy;
      };

      const orderedImages = moveIndexToFront(
        applyOrder(images, imagesOrder),
        imagesCoverIndex
      );
      const orderedVideos = moveIndexToFront(
        applyOrder(videos, videosOrder),
        videosCoverIndex
      );

      const charterRecord = await tx.charter.create({
        data: {
          captainId: captainProfile.id,
          charterType: payload.charterType,
          name: payload.name,
          state: payload.locationState,
          district: payload.locationDistrict,
          startingPoint: payload.address,
          postcode: payload.postcode,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          description: payload.description,
          pricingPlan,
          boatId: boatRecord.id,
          amenities: {
            create: (payload.includes ?? []).map((label) => ({ label })),
          },
          features: {
            create: (payload.boat.features ?? []).map((label) => ({ label })),
          },
          pickup: payload.pickup.available
            ? {
                create: {
                  available: true,
                  fee: toDecimal(payload.pickup.fee) ?? undefined,
                  notes: payload.pickup.notes ?? null,
                  areas: {
                    create: (payload.pickup.areas ?? []).map((label) => ({
                      label,
                    })),
                  },
                },
              }
            : undefined,
          policies: {
            create: {
              licenseProvided: payload.licenseProvided,
              catchAndKeep: Boolean(payload.policies.catchAndKeep),
              catchAndRelease: Boolean(payload.policies.catchAndRelease),
              childFriendly: Boolean(payload.policies.childFriendly),
              liveBaitProvided: Boolean(payload.policies.liveBaitProvided),
              alcoholAllowed: Boolean(payload.policies.alcoholAllowed),
              smokingAllowed: Boolean(payload.policies.smokingAllowed),
            },
          },
          trips: {
            create: payload.trip.map((trip, index) => ({
              name: trip.name,
              tripType: trip.tripType ?? `custom-${index + 1}`,
              price: toDecimal(trip.price) ?? new Prisma.Decimal(0),
              durationHours: parseDurationHours(trip.duration) ?? 0,
              maxAnglers: trip.maxAnglers,
              style: trip.private ? CharterStyle.PRIVATE : CharterStyle.SHARED,
              description: trip.description ?? null,
              startTimes: {
                create: (trip.startTimes ?? []).map((value) => ({ value })),
              },
              species: {
                create: (trip.targetSpecies ?? []).map((value) => ({ value })),
              },
              techniques: {
                create: (trip.techniques ?? []).map((value) => ({ value })),
              },
            })),
          },
          media: {
            create: [
              ...orderedImages.map((item, index) => ({
                kind: MediaKind.CHARTER_PHOTO,
                url: item.url,
                storageKey: item.name,
                sortOrder: index, // cover will be index 0
              })),
              ...orderedVideos.map((item, index) => ({
                kind: MediaKind.CHARTER_VIDEO,
                url: item.url,
                storageKey: item.name,
                sortOrder: index,
              })),
            ],
          },
        },
        select: { id: true },
      });

      return { charter: charterRecord };
    });

    const webhook = process.env.CHARTER_WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            source: "fishon.my/captains/register",
            timestamp: new Date().toISOString(),
            charter: payload,
          }),
        });
      } catch (err) {
        console.error("CHARTER_WEBHOOK_URL error:", err);
      }
    }

    revalidatePath("/captains/register");
    return { ok: true, charterId: charter.id };
  } catch (error) {
    console.error("submitCharter error", error);
    try {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (token && uploadedPhotoKeys.length) {
        await Promise.allSettled(
          uploadedPhotoKeys.map((k) => blobDel(k, { token }))
        );
      }
    } catch {}
    return {
      ok: false,
      error: "Failed to save your charter. Please try again soon.",
    };
  }
}

/**
 * Mark a charter media item as transcoded by updating its URL and optional metadata.
 * Intended to be called from the background transcode worker once the 720p file
 * is uploaded back to Blob using the same storageKey.
 */
export async function markMediaTranscoded(params: {
  storageKey: string; // Blob key (must match CharterMedia.storageKey)
  url: string; // Public URL of the optimized file
  sizeBytes?: number | null; // Optional: final file size
  width?: number | null; // Optional: video width
  height?: number | null; // Optional: video height
  mimeType?: string | null; // Optional: e.g. "video/mp4"
}) {
  const { storageKey, url, sizeBytes, width, height, mimeType } = params || {
    storageKey: "",
    url: "",
    sizeBytes: null,
    width: null,
    height: null,
    mimeType: null,
  };

  if (!storageKey || !url) {
    return { ok: false, error: "storageKey and url are required" };
  }

  try {
    const result = await prisma.charterMedia.updateMany({
      where: { storageKey },
      data: {
        url,
        sizeBytes:
          typeof sizeBytes === "number" && Number.isFinite(sizeBytes)
            ? Math.trunc(sizeBytes)
            : undefined,
        width:
          typeof width === "number" && Number.isFinite(width)
            ? Math.trunc(width)
            : undefined,
        height:
          typeof height === "number" && Number.isFinite(height)
            ? Math.trunc(height)
            : undefined,
        mimeType: mimeType ?? undefined,
      },
    });

    if (result.count === 0) {
      return {
        ok: false,
        error: `No CharterMedia found for storageKey: ${storageKey}`,
      };
    }

    // Optionally revalidate the register page or any media-consuming paths
    try {
      revalidatePath("/captains/register");
    } catch {}

    return { ok: true, updated: result.count };
  } catch (error) {
    console.error("markMediaTranscoded error", error);
    return { ok: false, error: "Failed to update media after transcode" };
  }
}

function resolvePricingPlan(value: string): CharterPricingPlan {
  switch (value?.toUpperCase()) {
    case "SILVER":
      return CharterPricingPlan.SILVER;
    case "GOLD":
      return CharterPricingPlan.GOLD;
    default:
      return CharterPricingPlan.BASIC;
  }
}

function toDecimal(value: number | null | undefined): Prisma.Decimal | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return new Prisma.Decimal(value);
}

function parseBoatLength(length: string | null | undefined): number | null {
  if (!length) return null;
  const match = length.match(/([\d.]+)/);
  return match ? Math.round(Number(match[1])) : null;
}

function parseDurationHours(
  duration: string | null | undefined
): number | null {
  if (!duration) return null;
  const match = duration.match(/([\d.]+)/);
  return match ? Math.round(Number(match[1])) : null;
}
