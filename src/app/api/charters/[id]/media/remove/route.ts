import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { MediaRemovalSchema } from "@fishon/schemas";
import { del } from "@vercel/blob";
import { NextResponse } from "next/server";
import { verifyCharterOwnership } from "@/lib/api/charter-middleware";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;

  // Verify charter ownership
  const authResult = await verifyCharterOwnership(charterId);
  if (!authResult.success) {
    return authResult.response;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );
  }
  const parsed = MediaRemovalSchema.safeParse(body);
  if (!parsed.success) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_body", details: parsed.error.flatten() },
        { status: 400 }
      )
    );
  }
  const { mediaId, storageKey } = parsed.data;
  if (!mediaId && !storageKey) {
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
  // PendingMedia flow removed; no-op for pending ids.
  return applySecurityHeaders(
    NextResponse.json({ ok: true, skipped: true, reason: "not_found" })
  );
}
