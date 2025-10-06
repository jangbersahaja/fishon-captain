import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

// Reuse path pattern logic similar to server/media.ts but localized for images/videos
const mediaKeyPattern = (key: string) => {
  if (key.startsWith("captains/") && key.includes("/media/")) return true; // new standard
  if (key.startsWith("temp/") && key.includes("/original/")) return true; // in-flight video
  if (key.startsWith("charters/") && key.includes("/media/")) return true; // legacy existing
  return false;
};

const IncomingMediaSchema = z.object({
  media: z.object({
    images: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          durationSeconds: z.number().int().positive().optional(),
        })
      )
      .max(20),
    videos: z
      .array(
        z.object({
          name: z.string().min(1),
          url: z.string().url(),
          thumbnailUrl: z.string().url().optional(),
          durationSeconds: z.number().int().positive().optional(),
        })
      )
      .max(5),
    deleteKeys: z.array(z.string()).optional(),
  }),
  deleteKeys: z.array(z.string()).optional(),
  order: z
    .object({
      images: z.array(z.number().int().nonnegative()).optional(),
      videos: z.array(z.number().int().nonnegative()).optional(),
    })
    .optional(),
});

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: { captain: { select: { userId: true } }, media: true, id: true },
  });
  if (!charter || charter.captain.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const parsed = await req
    .json()
    .then((json) => IncomingMediaSchema.safeParse(json))
    .catch(() => null);
  if (!parsed || !parsed.success) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_payload", details: parsed?.error?.issues },
        { status: 400 }
      )
    );
  }
  const body = parsed.data;

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

  // Enforce path pattern for new media (reject non-compliant new keys except legacy existing ones)
  for (const m of [...images, ...videos]) {
    if (!mediaKeyPattern(m.name)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "invalid_media_path", key: m.name },
          { status: 400 }
        )
      );
    }
  }

  const imageCreates = images.map((m, i) => ({
    kind: "CHARTER_PHOTO" as const,
    url: m.url,
    storageKey: m.name,
    sortOrder: i,
    thumbnailUrl: m.thumbnailUrl,
  }));
  const videoCreates = videos.map((m, i) => ({
    kind: "CHARTER_VIDEO" as const,
    url: m.url,
    storageKey: m.name,
    sortOrder: i,
    thumbnailUrl: m.thumbnailUrl,
    durationSeconds: m.durationSeconds,
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
