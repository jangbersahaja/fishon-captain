import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }
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
  if (!charter || charter.captain.userId !== userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }
  const images = charter.media
    .filter((m) => m.kind === "CHARTER_PHOTO")
    .map((m) => ({ name: m.sortOrder?.toString() || "image", url: m.url }));
  const videos = charter.media
    .filter((m) => m.kind === "CHARTER_VIDEO")
    .map((m) => ({
      name: m.sortOrder?.toString() || "video",
      url: m.url,
      thumbnailUrl: m.thumbnailUrl || undefined,
      durationSeconds: m.durationSeconds || undefined,
      storageKey: m.storageKey,
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
