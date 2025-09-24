import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export const runtime = "nodejs";

type MediaInput = {
  images: Array<{ name: string; url: string }>;
  videos: Array<{ name: string; url: string }>;
};

export async function PUT(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue: { id: string } =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const charterId = paramsValue.id;
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: { captain: { select: { userId: true } }, media: true, id: true },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const body = (await req.json().catch(() => null)) as {
    media: MediaInput;
    deleteKeys?: string[];
    order?: { images: number[]; videos: number[] };
  } | null;
  if (!body || !body.media)
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    );

  const toDelete = Array.isArray(body.deleteKeys) ? body.deleteKeys : [];

  // Delete requested blobs best-effort
  await Promise.allSettled(
    toDelete.map((key) =>
      del(key, { token: process.env.BLOB_READ_WRITE_TOKEN })
    )
  );

  // Replace charter media with provided set and sort order
  const images = body.media.images ?? [];
  const videos = body.media.videos ?? [];
  const imageCreates = images.map((m, i) => ({
    kind: "CHARTER_PHOTO" as const,
    url: m.url,
    storageKey: m.name,
    sortOrder: i,
  }));
  const videoCreates = videos.map((m, i) => ({
    kind: "CHARTER_VIDEO" as const,
    url: m.url,
    storageKey: m.name,
    sortOrder: i,
  }));

  await prisma.$transaction(async (tx) => {
    await tx.charterMedia.deleteMany({ where: { charterId } });
    if (imageCreates.length + videoCreates.length) {
      await tx.charter.update({
        where: { id: charterId },
        data: {
          media: {
            create: [...imageCreates, ...videoCreates],
          },
        },
      });
    }
  });

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
