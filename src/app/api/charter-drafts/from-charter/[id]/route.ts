import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { mapCharterToDraftValues } from "@/server/charterToDraft";
import {
  sanitizeForDraft,
  type DraftValues,
} from "@features/charter-form/charterForm.draft";
import type { CharterFormValues } from "@features/charter-form/charterForm.schema";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function POST(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue: { id: string } =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  // Fetch charter + relations to seed draft
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
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
          id: true,
          userId: true,
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
        },
      },
      media: {
        select: { kind: true, url: true, storageKey: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  // Attempt to find existing draft referencing this charter (unique charterId) even if SUBMITTED.
  let draft = await prisma.charterDraft.findFirst({
    where: { charterId: charter.id },
  });

  const draftValues = mapCharterToDraftValues({
    charter,
    captainProfile: {
      displayName: charter.captain.displayName,
      phone: charter.captain.phone,
      bio: charter.captain.bio,
      experienceYrs: charter.captain.experienceYrs,
    },
  });
  const formLike: CharterFormValues = {
    operator: {
      displayName: draftValues.operator.displayName,
      experienceYears: draftValues.operator.experienceYears as number,
      bio: draftValues.operator.bio ?? "",
      phone: draftValues.operator.phone,
      avatar: undefined,
    },
    charterType: draftValues.charterType,
    charterName: draftValues.charterName,
    state: draftValues.state,
    city: draftValues.city,
    startingPoint: draftValues.startingPoint,
    postcode: draftValues.postcode,
    latitude: (draftValues.latitude as number) ?? 0,
    longitude: (draftValues.longitude as number) ?? 0,
    description: draftValues.description ?? "",
    generatedDescription: draftValues.generatedDescription,
    tone: draftValues.tone as CharterFormValues["tone"],
    boat: draftValues.boat as CharterFormValues["boat"],
    amenities: draftValues.amenities as string[],
    policies: draftValues.policies as CharterFormValues["policies"],
    pickup: draftValues.pickup as CharterFormValues["pickup"],
    trips: draftValues.trips as CharterFormValues["trips"],
    photos: [],
    videos: [],
  };
  const sanitized: DraftValues = sanitizeForDraft(formLike);

  if (!draft) {
    // Create new draft referencing this charter
    draft = await prisma.charterDraft.create({
      data: {
        userId,
        status: "DRAFT",
        currentStep: 0,
        formVersion: 1,
        data: sanitized,
        charterId: charter.id,
      },
    });
  } else {
    // Reuse existing: reset to DRAFT, bump version, replace data
    draft = await prisma.charterDraft.update({
      where: { id: draft.id },
      data: {
        status: "DRAFT",
        currentStep: 0,
        data: sanitized,
        version: { increment: 1 },
        lastTouchedAt: new Date(),
      },
    });
  }

  // Build media arrays (do not store in draft; return alongside response for client hydration)
  const images = (charter.media || [])
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({ name: m.storageKey, url: m.url }));
  const videos = (charter.media || [])
    .filter((m) => m.kind === "CHARTER_VIDEO")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({ name: m.storageKey, url: m.url }));

  return applySecurityHeaders(
    NextResponse.json({ draft, media: { images, videos } })
  );
}

export async function GET(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue: { id: string } =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      captain: { select: { userId: true } },
      media: {
        select: { kind: true, url: true, storageKey: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const images = (charter.media || [])
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({ name: m.storageKey, url: m.url }));
  const videos = (charter.media || [])
    .filter((m) => m.kind === "CHARTER_VIDEO")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((m) => ({ name: m.storageKey, url: m.url }));

  return applySecurityHeaders(NextResponse.json({ media: { images, videos } }));
}
