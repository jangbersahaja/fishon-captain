import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BodySchema = z.object({
  mediaId: z.string().optional(), // direct CharterMedia id
  storageKey: z.string().optional(), // fallback if id not known yet
  pendingId: z.string().optional(), // allow removing queued/transcoding pending media
});

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function POST(
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
    select: { captain: { select: { userId: true } }, id: true },
  });
  if (!charter || charter.captain.userId !== userId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 }
      )
    );
  }
  const { mediaId, storageKey, pendingId } = parsed.data;
  if (!mediaId && !storageKey && !pendingId) {
    return applySecurityHeaders(
      NextResponse.json({ error: "missing_identifier" }, { status: 400 })
    );
  }
  // Try charterMedia first
  let removedType: string | null = null;
  if (mediaId || storageKey) {
    const found = mediaId
      ? await prisma.charterMedia.findFirst({
          where: { id: mediaId, charterId },
        })
      : await prisma.charterMedia.findFirst({
          where: { storageKey: storageKey!, charterId },
        });
    if (found) {
      await prisma.$transaction(async (tx) => {
        await tx.charterMedia.delete({ where: { id: found.id } });
      });
      try {
        await del(found.storageKey, {
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
      } catch (e) {
        console.warn("[media_remove] blob_delete_failed", {
          key: found.storageKey,
          message: (e as Error).message,
        });
      }
      removedType = "charterMedia";
    }
    if (removedType) {
      return applySecurityHeaders(NextResponse.json({ ok: true, removedType }));
    }
  }
  // Pending removal path
  if (pendingId) {
    const pending = await prisma.pendingMedia.findFirst({
      where: { id: pendingId, charterId },
    });
    if (!pending) {
      return applySecurityHeaders(
        NextResponse.json({ ok: true, skipped: true })
      );
    }
    // Mark failed & attempt deletion of original or final depending on progress
    await prisma.pendingMedia.update({
      where: { id: pending.id },
      data: { status: "FAILED", error: "removed_by_user" },
    });
    const keysToDelete = [pending.originalKey];
    if (pending.finalKey) keysToDelete.push(pending.finalKey);
    for (const k of keysToDelete) {
      try {
        await del(k, { token: process.env.BLOB_READ_WRITE_TOKEN });
      } catch (e) {
        console.warn("[media_remove] blob_delete_failed_pending", {
          key: k,
          message: (e as Error).message,
        });
      }
    }
    removedType = "pendingMedia";
    return applySecurityHeaders(
      NextResponse.json({ ok: true, removedType, pendingId })
    );
  }
  return applySecurityHeaders(
    NextResponse.json({ ok: true, skipped: true, reason: "not_found" })
  );
}
