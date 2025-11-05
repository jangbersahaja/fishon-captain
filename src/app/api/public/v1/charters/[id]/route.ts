import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function getAuthToken(req: Request): string | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Check Bearer token
  const token = getAuthToken(req);
  const expected = process.env.FISHON_CAPTAIN_API_KEY;
  if (!token || !expected || token !== expected) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }

  // Await params as required by Next.js App Router
  const { id } = await ctx.params;
  const charter = await prisma.charter.findUnique({
    where: { id },
    include: {
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
        orderBy: { sortOrder: "asc" },
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
        orderBy: { createdAt: "asc" },
      },
      unavailability: true,
    },
  });
  if (!charter) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  if (!charter) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  // Use unknown for type-safe property access
  const c = charter as {
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
      alcoholNotAllowed: boolean;
      smokingNotAllowed: boolean;
    };
    schedule?: {
      scheduleType: string;
      operationalDays: number[];
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

  // Unavailability
  const unavailability = Array.isArray(c.unavailability)
    ? c.unavailability.map((u) => ({
        startDate: u.startDate.toISOString().slice(0, 10),
        endDate: u.endDate.toISOString().slice(0, 10),
        reason: u.reason || null,
      }))
    : [];

  // Amenities and features
  const amenities =
    c.amenities?.map((a: { label: string }) => ({ label: a.label })) || [];
  const features =
    c.features?.map((f: { label: string }) => ({ label: f.label })) || [];

  // Media
  const media =
    c.media?.map((m) => ({
      id: m.id,
      url: m.url,
      storageKey: m.storageKey,
      sortOrder: m.sortOrder,
      mimeType: m.mimeType,
      kind: "CHARTER_PHOTO",
    })) || [];

  // Videos
  const videos =
    c.videos?.map((v, idx) => ({
      id: v.id,
      url: v.ready720pUrl || v.originalUrl,
      name: v.blobKey || undefined,
      thumbnailUrl: v.thumbnailUrl,
      kind: "CHARTER_VIDEO",
      sortOrder: idx,
    })) || [];

  // Trips
  const trips =
    c.trips?.map((t) => ({
      id: t.id,
      name: t.name,
      tripType: t.tripType,
      price:
        typeof t.price === "object" && t.price !== null && "toNumber" in t.price
          ? (t.price as Prisma.Decimal).toNumber()
          : t.price,
      durationHours: t.durationHours,
      maxAnglers: t.maxAnglers,
      style: t.style,
      description: t.description ?? "",
      promoPrice:
        t.promoPrice &&
        typeof t.promoPrice === "object" &&
        t.promoPrice !== null &&
        "toNumber" in t.promoPrice
          ? (t.promoPrice as Prisma.Decimal).toNumber()
          : t.promoPrice,
      startTimes:
        t.startTimes?.map((st: { value: string }) => ({ value: st.value })) ||
        [],
      species:
        t.species?.map((s: { value: string }) => ({ value: s.value })) || [],
      techniques:
        t.techniques?.map((tech: { value: string }) => ({
          value: tech.value,
        })) || [],
    })) || [];

  // Pickup
  const pickup = c.pickup
    ? {
        available: c.pickup.available,
        fee: c.pickup.fee,
        notes: c.pickup.notes,
        areas:
          c.pickup.areas?.map((a: { label: string }) => ({ label: a.label })) ||
          [],
      }
    : null;

  // Policies
  const policies = c.policies
    ? {
        licenseProvided: c.policies.licenseProvided,
        catchAndKeep: c.policies.catchAndKeep,
        catchAndRelease: c.policies.catchAndRelease,
        childFriendly: c.policies.childFriendly,
        liveBaitProvided: c.policies.liveBaitProvided,
        alcoholAllowed: !c.policies.alcoholNotAllowed,
        smokingAllowed: !c.policies.smokingNotAllowed,
      }
    : null;

  // Schedule
  const schedule = c.schedule
    ? {
        type: c.schedule.scheduleType,
        operationalDays: c.schedule.operationalDays,
      }
    : null;

  // Captain
  const captain = c.captain
    ? {
        id: c.captain.id,
        firstName: c.captain.firstName,
        lastName: c.captain.lastName,
        displayName: c.captain.displayName,
        phone: c.captain.phone,
        bio: c.captain.bio,
        experienceYrs: c.captain.experienceYrs,
        avatarUrl: c.captain.avatarUrl,
      }
    : null;

  // Boat
  const boat = c.boat
    ? {
        id: c.boat.id,
        name: c.boat.name,
        type: c.boat.type,
        lengthFt: c.boat.lengthFt,
        capacity: c.boat.capacity,
      }
    : null;

  const response = {
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
    captain,
    boat,
    trips,
    amenities,
    features,
    media,
    videos,
    pickup,
    policies,
    schedule,
    unavailability,
  };

  return applySecurityHeaders(NextResponse.json({ charter: response }));
}
