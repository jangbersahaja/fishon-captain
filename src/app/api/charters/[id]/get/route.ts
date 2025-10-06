import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }

  // Check for admin override
  const url = new URL(req.url);
  const adminUserId = url.searchParams.get("adminUserId");
  const isAdminOverride = userRole === "ADMIN" && adminUserId;

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      boat: true,
      amenities: true,
      features: true,
      policies: true,
      pickup: { include: { areas: true } },
      trips: { include: { startTimes: true, species: true, techniques: true } },
      captain: {
        select: {
          userId: true,
          avatarUrl: true,
          displayName: true,
          phone: true,
          bio: true,
          experienceYrs: true,
        },
      },
      media: {
        select: {
          kind: true,
          url: true,
          sortOrder: true,
          thumbnailUrl: true,
          durationSeconds: true,
          storageKey: true,
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!charter) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  // Check ownership or admin override
  if (!isAdminOverride && charter.captain.userId !== userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }
  const images = charter.media
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .map((m) => ({
      name: m.storageKey || m.url,
      url: m.url,
      storageKey: m.storageKey || undefined,
      sortOrder: m.sortOrder ?? undefined,
    }));
  const videos = charter.media
    .filter((m) => m.kind === "CHARTER_VIDEO")
    .map((m) => ({
      name: m.storageKey || m.url,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      durationSeconds: m.durationSeconds || undefined,
      storageKey: m.storageKey || undefined,
      sortOrder: m.sortOrder ?? undefined,
    }));
  // Default cover index to 0 (first image) for now; future: store in DB
  const imagesCoverIndex = images.length > 0 ? 0 : null;
  return applySecurityHeaders(
    NextResponse.json({
      charter,
      media: {
        images,
        videos,
        avatar: charter.captain.avatarUrl || null,
        imagesCoverIndex,
      },
    })
  );
}
