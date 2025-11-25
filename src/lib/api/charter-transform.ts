/**
 * Shared utilities for transforming charter data for public API responses
 */

import { Prisma } from "@prisma/client";

/**
 * Shared Prisma include configuration for fetching charter data
 */
export const CHARTER_PUBLIC_INCLUDE = {
  boat: true,
  amenities: { select: { label: true } },
  features: { select: { label: true } },
  policies: true,
  pickup: { include: { areas: { select: { label: true } } } },
  schedule: true,
  trips: {
    include: {
      startTimes: { select: { value: true } },
      species: { select: { value: true } },
      techniques: { select: { value: true } },
    },
  },
  captain: true,
  media: {
    select: {
      id: true,
      url: true,
      storageKey: true,
      sortOrder: true,
      mimeType: true,
    },
    orderBy: { sortOrder: "asc" as const },
  },
  videos: {
    where: { processStatus: "ready" },
    select: {
      id: true,
      ready720pUrl: true,
      originalUrl: true,
      blobKey: true,
      thumbnailUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
  unavailability: true,
} as const;

/**
 * Type for charter with all required relations
 */
type CharterWithRelations = {
  id: string;
  name: string;
  charterType: string;
  state: string;
  city: string;
  pricingPlan: string;
  startingPoint: string;
  postcode: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  amenities?: { label: string }[];
  features?: { label: string }[];
  media?: {
    id: string;
    url: string;
    storageKey: string;
    sortOrder: number;
    mimeType: string;
  }[];
  videos?: {
    id: string;
    ready720pUrl?: string;
    originalUrl: string;
    blobKey?: string;
    thumbnailUrl?: string;
    createdAt: Date;
  }[];
  trips?: {
    id: string;
    name: string;
    tripType: string;
    price: Prisma.Decimal | number;
    durationHours: number;
    maxAnglers: number;
    style: string;
    description: string | null;
    promoPrice?: Prisma.Decimal | number | null;
    priceOverride?: Prisma.Decimal | number | null;
    startTimes?: { value: string }[];
    species?: { value: string }[];
    techniques?: { value: string }[];
  }[];
  pickup?: {
    available: boolean;
    fee: Prisma.Decimal | number | null;
    notes: string | null;
    areas?: { label: string }[];
  };
  policies?: {
    licenseProvided: boolean;
    catchAndKeep: boolean;
    catchAndRelease: boolean;
    childFriendly: boolean;
    liveBaitProvided: boolean;
    alcoholAllowed?: boolean;
    alcoholNotAllowed?: boolean;
    smokingAllowed?: boolean;
    smokingNotAllowed?: boolean;
  };
  schedule?: {
    scheduleType: string;
    operationalDays: number[] | string[];
  };
  captain?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phone: string;
    bio: string;
    experienceYrs: number;
    avatarUrl: string;
  };
  boat?: {
    id: string;
    name: string;
    type: string;
    lengthFt: number;
    capacity: number;
  };
  unavailability?: {
    startDate: Date;
    endDate: Date;
    reason?: string;
  }[];
};

/**
 * Transform media array for API response
 */
export function transformMedia(media?: CharterWithRelations["media"]) {
  return (
    media?.map((m) => ({
      id: m.id,
      url: m.url,
      storageKey: m.storageKey,
      sortOrder: m.sortOrder,
      mimeType: m.mimeType,
      kind: "CHARTER_PHOTO" as const,
    })) || []
  );
}

/**
 * Transform videos array for API response
 */
export function transformVideos(videos?: CharterWithRelations["videos"]) {
  return (
    videos?.map((v, idx) => ({
      id: v.id,
      url: v.ready720pUrl || v.originalUrl,
      name: v.blobKey || undefined,
      thumbnailUrl: v.thumbnailUrl,
      kind: "CHARTER_VIDEO" as const,
      sortOrder: idx,
    })) || []
  );
}

/**
 * Convert Prisma Decimal to number if needed
 */
function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined
): number | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value) {
    return (value as Prisma.Decimal).toNumber();
  }
  return value as number;
}

/**
 * Transform trips array for API response
 */
export function transformTrips(trips?: CharterWithRelations["trips"]) {
  return (
    trips?.map((t) => ({
      id: t.id,
      name: t.name,
      tripType: t.tripType,
      price: decimalToNumber(t.price) as number,
      durationHours: t.durationHours,
      maxAnglers: t.maxAnglers,
      style: t.style,
      description: t.description ?? "",
      promoPrice: decimalToNumber(t.promoPrice),
      priceOverride: decimalToNumber(t.priceOverride),
      startTimes:
        t.startTimes?.map((st: { value: string }) => ({ value: st.value })) ||
        [],
      species:
        t.species?.map((s: { value: string }) => ({ value: s.value })) || [],
      techniques:
        t.techniques?.map((tech: { value: string }) => ({
          value: tech.value,
        })) || [],
    })) || []
  );
}

/**
 * Transform pickup data for API response
 */
export function transformPickup(pickup?: CharterWithRelations["pickup"]) {
  if (!pickup) return null;

  return {
    available: pickup.available,
    fee: pickup.fee,
    notes: pickup.notes,
    areas: pickup.areas?.map((a) => ({ label: a.label })) || [],
  };
}

/**
 * Transform policies data for API response
 */
export function transformPolicies(policies?: CharterWithRelations["policies"]) {
  if (!policies) return null;

  return {
    licenseProvided: policies.licenseProvided,
    catchAndKeep: policies.catchAndKeep,
    catchAndRelease: policies.catchAndRelease,
    childFriendly: policies.childFriendly,
    liveBaitProvided: policies.liveBaitProvided,
    alcoholAllowed: policies.alcoholAllowed ?? !policies.alcoholNotAllowed,
    smokingAllowed: policies.smokingAllowed ?? !policies.smokingNotAllowed,
  };
}

/**
 * Transform schedule data for API response
 */
export function transformSchedule(schedule?: CharterWithRelations["schedule"]) {
  if (!schedule) return null;

  return {
    type: schedule.scheduleType,
    operationalDays: schedule.operationalDays,
  };
}

/**
 * Transform captain data for API response
 */
export function transformCaptain(captain?: CharterWithRelations["captain"]) {
  if (!captain) return null;

  return {
    id: captain.id,
    firstName: captain.firstName,
    lastName: captain.lastName,
    displayName: captain.displayName,
    phone: captain.phone,
    bio: captain.bio,
    experienceYrs: captain.experienceYrs,
    avatarUrl: captain.avatarUrl,
  };
}

/**
 * Transform boat data for API response
 */
export function transformBoat(boat?: CharterWithRelations["boat"]) {
  if (!boat) return null;

  return {
    id: boat.id,
    name: boat.name,
    type: boat.type,
    lengthFt: boat.lengthFt,
    capacity: boat.capacity,
  };
}

/**
 * Transform amenities array for API response
 */
export function transformAmenities(amenities?: { label: string }[]) {
  return amenities?.map((a) => ({ label: a.label })) || [];
}

/**
 * Transform features array for API response
 */
export function transformFeatures(features?: { label: string }[]) {
  return features?.map((f) => ({ label: f.label })) || [];
}

/**
 * Transform unavailability array for API response
 */
export function transformUnavailability(
  unavailability?: CharterWithRelations["unavailability"]
) {
  return Array.isArray(unavailability)
    ? unavailability.map((u) => ({
        startDate: u.startDate.toISOString().slice(0, 10),
        endDate: u.endDate.toISOString().slice(0, 10),
        reason: u.reason || null,
      }))
    : [];
}

/**
 * Transform a full charter object for API response
 */
export function transformCharter(charter: unknown) {
  const c = charter as CharterWithRelations;

  return {
    id: c.id,
    name: c.name,
    charterType: c.charterType,
    state: c.state,
    district: c.city,
    startingPoint: c.startingPoint,
    postcode: c.postcode,
    latitude: c.latitude,
    longitude: c.longitude,
    description: c.description,
    pricingPlan: c.pricingPlan,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    captain: transformCaptain(c.captain),
    boat: transformBoat(c.boat),
    trips: transformTrips(c.trips),
    amenities: transformAmenities(c.amenities),
    features: transformFeatures(c.features),
    media: transformMedia(c.media),
    videos: transformVideos(c.videos),
    pickup: transformPickup(c.pickup),
    policies: transformPolicies(c.policies),
    schedule: transformSchedule(c.schedule),
    unavailability: transformUnavailability(c.unavailability),
  };
}
