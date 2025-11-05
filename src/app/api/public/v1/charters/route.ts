import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function getAuthToken(req: Request): string | null {
  const auth =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export async function GET(req: Request) {
  // Check Bearer token
  const token = getAuthToken(req);
  const expected = process.env.FISHON_CAPTAIN_API_KEY;
  if (!token || !expected || token !== expected) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }

  // Fetch all active charters with all required nested relations
  const charters = await prisma.charter.findMany({
    where: { isActive: true },
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

  // Format unavailability and response for each charter
  // Minimal types for linter compliance

  const result = (charters as unknown[]).map((charter) => {
    // Cast charter to a concrete type for type-safe property access
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
        thumbnailUrl: string;
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
        price: number;
        durationHours: number;
        maxAnglers: number;
        style: string;
        description: string;
        promoPrice?: number;
        startTimes?: { value: string }[];
        species?: { value: string }[];
        techniques?: { value: string }[];
      }[];
      pickup?: {
        available: boolean;
        fee: number | null;
        notes: string | null;
        areas?: { label: string }[];
      };
      policies?: {
        licenseProvided: boolean;
        catchAndKeep: boolean;
        catchAndRelease: boolean;
        childFriendly: boolean;
        liveBaitProvided: boolean;
        alcoholAllowed: boolean;
        smokingAllowed: boolean;
      };
      schedule?: {
        scheduleType: string;
        operationalDays: string[];
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

    // Media
    const media =
      c.media?.map((m) => ({
        id: m.id,
        url: m.url,
        storageKey: m.storageKey,
        sortOrder: m.sortOrder,
        mimeType: m.mimeType,
        thumbnailUrl: m.thumbnailUrl,
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
        price: t.price,
        durationHours: t.durationHours,
        maxAnglers: t.maxAnglers,
        style: t.style,
        description: t.description,
        promoPrice: t.promoPrice,
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
          areas: c.pickup.areas?.map((a) => ({ label: a.label })) || [],
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
          alcoholAllowed: c.policies.alcoholAllowed,
          smokingAllowed: c.policies.smokingAllowed,
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

    // Amenities and features
    const amenities = c.amenities?.map((a) => ({ label: a.label })) || [];
    const features = c.features?.map((f) => ({ label: f.label })) || [];

    // Unavailability
    const unavailability = Array.isArray(c.unavailability)
      ? c.unavailability.map((u) => ({
          startDate: u.startDate.toISOString().slice(0, 10),
          endDate: u.endDate.toISOString().slice(0, 10),
          reason: u.reason || null,
        }))
      : [];

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
  });

  return applySecurityHeaders(NextResponse.json({ charters: result }));
}
