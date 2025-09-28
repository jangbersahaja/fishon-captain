// DEPRECATED: This combined photo/video upload route is superseded by:
//   /api/media/photo  (direct photo CharterMedia creation)
//   /api/media/video  (video -> PendingMedia + transcode queue)
// Keep until all clients migrated, then remove.
import { SMALL_IMAGE_MAX_BYTES } from "@/config/mediaProcessing";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SessionUserShape {
  user?: { id?: string };
}
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionUserShape).user;
  if (!user) return null;
  return typeof user.id === "string" ? user.id : null;
}

function resolveSiteUrl(req: Request): string | null {
  const trimTrailing = (val: string) => val.replace(/\/+$/, "");

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return trimTrailing(parsed.toString());
    } catch {
      // fallthrough to other hints
    }
  }

  const originHeader = req.headers.get("origin");
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      return trimTrailing(parsed.toString());
    } catch {
      // ignore bad header
    }
  }

  try {
    const parsed = new URL(req.url);
    if (parsed.origin) {
      return trimTrailing(parsed.origin);
    }
  } catch {
    // ignore
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    try {
      const parsed = vercelUrl.startsWith("http")
        ? new URL(vercelUrl)
        : new URL(`https://${vercelUrl}`);
      return trimTrailing(parsed.toString());
    } catch {
      // ignore
    }
  }

  return null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const siteUrl = resolveSiteUrl(req);
  try {
    const form = await req.formData();
    console.log("📥 UPLOAD: received form-data", {
      hasFile: form.has("file"),
      charterId: form.get("charterId"),
      correlationId: form.get("correlationId"),
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    // kind (optional hint) ignored for now; we auto-detect by mime
    const providedCorrelation = form.get("correlationId");
    const charterId =
      typeof form.get("charterId") === "string"
        ? (form.get("charterId") as string)
        : null;
    const correlationId =
      typeof providedCorrelation === "string" && providedCorrelation.length > 0
        ? providedCorrelation
        : crypto.randomUUID();

    const originalName = file.name || "upload";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 160);
    // const extMatch = sanitized.match(/\.([^.]+)$/); // reserved for future processing
    const mime = file.type || "application/octet-stream";
    const sizeBytes = file.size;

    const isVideo =
      /video\//.test(mime) || /(mp4|mov|webm|ogg|avi|mkv)$/i.test(sanitized);
    const kind = isVideo ? "VIDEO" : "IMAGE";
    // raw original key
    const idPart = crypto.randomUUID();
    const originalKey = `captains/${userId}/media/original/${idPart}-${sanitized}`;

    // Put original first
    const putRes = await put(originalKey, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    let finalKey: string | null = null;
    let finalUrl: string | null = null;
    let skippedResize = false;
    const thumbnailKey: string | null = null;
    const thumbnailUrl: string | null = null;
    let status: "QUEUED" | "READY" = "READY";

    if (kind === "IMAGE") {
      // Decide skip resize purely on size for now
      if (sizeBytes <= SMALL_IMAGE_MAX_BYTES) {
        skippedResize = true;
        finalKey = originalKey;
        finalUrl = putRes.url;
      } else {
        // Future: perform server-side resize. For now treat as final.
        finalKey = originalKey;
        finalUrl = putRes.url;
      }
    } else {
      // VIDEO: mark queued for worker
      status = "QUEUED";
    }

    // Create pending record
    const pending = await prisma.pendingMedia.create({
      data: {
        userId,
        charterId: charterId || undefined,
        kind,
        originalKey,
        originalUrl: putRes.url,
        finalKey: finalKey || undefined,
        finalUrl: finalUrl || undefined,
        thumbnailKey: thumbnailKey || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        status: status === "READY" ? "READY" : "QUEUED",
        sizeBytes,
        mimeType: mime,
        correlationId,
      },
      select: {
        id: true,
        status: true,
        finalUrl: true,
        originalUrl: true,
        finalKey: true,
        originalKey: true,
        kind: true,
      },
    });

    // Auto-attach images if charterId present
    if (kind === "IMAGE" && charterId) {
      try {
        console.log("🖼️  UPLOAD: Creating charter media for image", {
          charterId,
          finalUrl: finalUrl || putRes.url,
          finalKey: finalKey || originalKey,
          pendingId: pending.id,
        });
        const cm = await prisma.charterMedia.create({
          data: {
            charterId,
            kind: "CHARTER_PHOTO",
            url: finalUrl || putRes.url,
            storageKey: finalKey || originalKey,
            pendingMediaId: pending.id,
            sortOrder: 999,
          },
          select: { id: true },
        });
        console.log("✅ UPLOAD: Created charter media for image", {
          charterMediaId: cm.id,
        });
        await prisma.pendingMedia.update({
          where: { id: pending.id },
          data: { consumedAt: new Date(), charterMediaId: cm.id },
        });
        console.log("🔗 UPLOAD: Linked pending image to charter");
      } catch (e) {
        console.error("❌ UPLOAD: Failed to attach image to charter", e);
      }
    } else {
      console.log("⏭️  UPLOAD: Skipping image charter attachment", {
        isImage: kind === "IMAGE",
        hasCharterId: !!charterId,
      });
    }

    // Queue transcode job for videos
    if (kind === "VIDEO" && siteUrl) {
      try {
        await fetch(`${siteUrl}/api/jobs/transcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pendingMediaId: pending.id,
            originalKey,
            originalUrl: putRes.url,
            filename: sanitized,
            userId,
            charterId: charterId || undefined,
          }),
        });
      } catch (err) {
        console.error("queue transcode failed", err);
      }
    } else if (kind === "VIDEO" && !siteUrl) {
      console.warn("queue transcode skipped: unable to resolve site URL");
    }

    return NextResponse.json({
      ok: true,
      pendingMediaId: pending.id,
      status: pending.status,
      isVideo: kind === "VIDEO",
      previewUrl: finalUrl || putRes.url,
      originalKey,
      skippedResize,
      correlationId,
    });
  } catch (e) {
    console.error("media upload error", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
