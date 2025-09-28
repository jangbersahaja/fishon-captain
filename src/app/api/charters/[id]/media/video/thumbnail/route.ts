import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as { user?: { id?: string } }).user;
  return user && typeof user.id === "string" ? user.id : null;
}

const BodySchema = z.object({
  storageKey: z.string().min(1),
  dataUrl: z
    .string()
    .min(50)
    .refine((v) => v.startsWith("data:image/"), "must be data:image/* base64"),
  durationSeconds: z
    .number()
    .int()
    .positive()
    .max(60 * 60 * 6)
    .optional(),
});

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }
  let bodyJson: unknown = null;
  try {
    bodyJson = await req.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );
  }
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_body", details: parsed.error.issues },
        { status: 400 }
      )
    );
  }
  const { storageKey, dataUrl, durationSeconds } = parsed.data;

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: { captain: { select: { userId: true } }, id: true },
  });
  if (!charter || charter.captain.userId !== userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  const media = await prisma.charterMedia.findFirst({
    where: { charterId, kind: "CHARTER_VIDEO", storageKey },
    select: { id: true, thumbnailUrl: true, durationSeconds: true },
  });
  if (!media) {
    return applySecurityHeaders(
      NextResponse.json({ error: "media_not_found" }, { status: 404 })
    );
  }

  if (media.thumbnailUrl) {
    return applySecurityHeaders(
      NextResponse.json({
        ok: true,
        thumbnailUrl: media.thumbnailUrl,
        durationSeconds: media.durationSeconds,
      })
    );
  }

  const match = /^data:(image\/(?:png|jpe?g|webp));base64,(.*)$/i.exec(dataUrl);
  if (!match) {
    return applySecurityHeaders(
      NextResponse.json({ error: "unsupported_data_url" }, { status: 400 })
    );
  }
  const mime = match[1];
  const b64 = match[2];
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "decode_failed" }, { status: 400 })
    );
  }
  if (!buf.length) {
    return applySecurityHeaders(
      NextResponse.json({ error: "empty_image" }, { status: 400 })
    );
  }

  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
    ? "webp"
    : "jpg";
  const key = `captains/${userId}/media/thumb/${media.id}-${crypto
    .randomUUID()
    .slice(0, 8)}.${ext}`;

  let blobUrl: string | null = null;
  try {
    const putRes = await put(key, buf, {
      access: "public",
      contentType: mime,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    blobUrl = putRes.url;
  } catch (e) {
    console.error("[thumb.persist] blob_put_failed", e);
    return applySecurityHeaders(
      NextResponse.json({ error: "blob_upload_failed" }, { status: 500 })
    );
  }

  const updated = await prisma.charterMedia.update({
    where: { id: media.id },
    data: {
      thumbnailUrl: blobUrl,
      durationSeconds:
        typeof durationSeconds === "number" && !media.durationSeconds
          ? durationSeconds
          : undefined,
    },
    select: { thumbnailUrl: true, durationSeconds: true },
  });
  console.log("[thumb.persist] success", {
    charterId,
    mediaId: media.id,
    hasDuration: !!updated.durationSeconds,
    size: buf.length,
  });

  return applySecurityHeaders(
    NextResponse.json({
      ok: true,
      thumbnailUrl: updated.thumbnailUrl,
      durationSeconds: updated.durationSeconds,
    })
  );
}
