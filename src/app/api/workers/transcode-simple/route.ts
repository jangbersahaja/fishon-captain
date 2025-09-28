import { prisma } from "@/lib/prisma";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for transcoding

type TranscodePayload = {
  originalKey: string;
  originalUrl: string;
  filename: string;
  pendingMediaId?: string;
  charterId?: string; // optional now
  userId?: string; // may be derived from pending record or charter
  metadata?: { durationSeconds?: number; width?: number; height?: number };
};

// Base64 (tiny) 320x180 PNG placeholder (solid dark gray with triangle) generated offline
// Keeping this small (~250 bytes) to avoid bloating bundle.
const PLACEHOLDER_THUMB_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABaCAYAAAB7n0PpAAAACXBIWXMAAAsTAAALEwEAmpwYAAABM0lEQVR4nO3UsQ3CQBBF0V0gBpJgFQiES6SbKIDRIBIkAUSgDgoKGSvM77uDFz9mTyc3u7u7ubt/8+Xnbz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePw5m2bNm2bNmybdu2bdu2bdu2bds2bds2bds2bdu2bdu2bdu2bdv2JDkX9L90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9Jd8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J5Y0m7btm3btm3btm3btm3bts2bds2bds2bds2bds2bdv25fYDKVAJ5yCS5MkAAAAASUVORK5CYII=";

async function generatePlaceholderThumbnailBuffer(): Promise<ArrayBuffer> {
  return Buffer.from(PLACEHOLDER_THUMB_PNG_BASE64, "base64").buffer;
}

// Simple video "processing": currently pass-through + guaranteed placeholder thumbnail
async function processVideo(videoBuffer: ArrayBuffer): Promise<{
  compressedVideo: ArrayBuffer;
  thumbnail: ArrayBuffer | null;
  thumbnailExt: string;
}> {
  try {
    const thumbnail = await generatePlaceholderThumbnailBuffer();
    return { compressedVideo: videoBuffer, thumbnail, thumbnailExt: ".png" };
  } catch (e) {
    console.warn(
      "Thumbnail placeholder generation failed – continuing without",
      e
    );
    return {
      compressedVideo: videoBuffer,
      thumbnail: null,
      thumbnailExt: ".png",
    };
  }
}

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🎬 TRANSCODE-SIMPLE: Starting video processing", {
    timestamp: new Date().toISOString(),
  });
  // Keep outer references so we can mark FAILED on any thrown error
  let pendingMediaIdRef: string | undefined;
  let originalKeyRef: string | undefined;
  const fail = async (reason: string, extra?: Record<string, unknown>) => {
    const detail = extra?.error
      ? `${reason}:${String(extra.error).slice(0, 120)}`
      : reason;
    console.error("💥 TRANSCODE-SIMPLE: Failing transcode", {
      reason,
      detail,
      ...extra,
    });
    if (pendingMediaIdRef) {
      try {
        await prisma.pendingMedia.update({
          where: { id: pendingMediaIdRef },
          data: { status: "FAILED", error: detail },
        });
        console.log("❌ TRANSCODE-SIMPLE: Marked pending media FAILED", {
          pendingMediaId: pendingMediaIdRef,
          error: detail,
        });
      } catch (e) {
        console.error(
          "⚠️  TRANSCODE-SIMPLE: Could not mark pending media FAILED",
          e
        );
      }
    }
  };

  try {
    const body = (await req.json()) as TranscodePayload;

    if (!body.originalKey || !body.originalUrl || !body.filename) {
      console.log("❌ TRANSCODE-SIMPLE: Missing required fields", body);
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { originalKey, originalUrl, filename, pendingMediaId, metadata } =
      body;
    let { userId, charterId } = body;
    pendingMediaIdRef = pendingMediaId;
    originalKeyRef = originalKey;

    console.log("📋 TRANSCODE-SIMPLE: Processing request", {
      originalKey,
      filename,
      pendingMediaId,
      userId,
      charterId,
    });

    // Load pending media if id provided and transition status
    let pending: {
      id: string;
      userId: string;
      charterId: string | null;
      status: string;
    } | null = null;
    if (pendingMediaId) {
      pending = await prisma.pendingMedia.findUnique({
        where: { id: pendingMediaId },
      });
      console.log("📄 TRANSCODE-SIMPLE: Found pending record", {
        pending: pending ? { id: pending.id, status: pending.status } : null,
      });

      if (!pending) {
        console.log("❌ TRANSCODE-SIMPLE: Pending record not found", {
          pendingMediaId,
        });
        return NextResponse.json(
          { error: "pending_not_found" },
          { status: 404 }
        );
      }
      if (pending.status === "READY") {
        console.log("⏭️  TRANSCODE-SIMPLE: Already processed, skipping", {
          pendingMediaId,
        });
        return NextResponse.json({ ok: true, skipped: true });
      }
      // Derive userId / charterId if missing
      if (!userId) userId = pending.userId;
      if (!charterId && pending.charterId) charterId = pending.charterId;
      try {
        await prisma.pendingMedia.update({
          where: { id: pendingMediaId },
          data: { status: "TRANSCODING" },
        });
        console.log("🔄 TRANSCODE-SIMPLE: Updated status to TRANSCODING", {
          pendingMediaId,
        });
      } catch (e) {
        console.log(
          "⚠️  TRANSCODE-SIMPLE: Failed to update status to TRANSCODING",
          { pendingMediaId, error: e }
        );
        /* ignore race */
      }
    }

    console.log("⬇️  TRANSCODE-SIMPLE: Downloading video from:", originalUrl);

    // Download the original video
    let videoResponse: Response;
    try {
      videoResponse = await fetch(originalUrl);
    } catch (e) {
      await fail("download_fetch_exception", {
        originalUrl,
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: "download_failed" }, { status: 500 });
    }
    if (!videoResponse.ok) {
      await fail("download_http_status_" + videoResponse.status, {
        originalUrl,
        status: videoResponse.status,
      });
      return NextResponse.json(
        { error: "download_failed_status" },
        { status: 500 }
      );
    }

    const originalBuffer = await videoResponse.arrayBuffer();
    console.log("✅ TRANSCODE-SIMPLE: Downloaded video", {
      size: originalBuffer.byteLength,
      sizeKB: Math.round(originalBuffer.byteLength / 1024),
    });

    // Process video (compress and generate thumbnail)
    let compressedVideo: ArrayBuffer;
    let thumbnail: ArrayBuffer | null;
    let thumbnailExt: string;
    try {
      ({ compressedVideo, thumbnail, thumbnailExt } = await processVideo(
        originalBuffer
      ));
    } catch (e) {
      await fail("process_video_exception", {
        error: e instanceof Error ? e.message : String(e),
      });
      return NextResponse.json({ error: "process_failed" }, { status: 500 });
    }
    console.log("🔄 TRANSCODE-SIMPLE: Processed video", {
      compressedSize: compressedVideo.byteLength,
      hasThumbnail: !!thumbnail,
      thumbnailSize: thumbnail ? thumbnail.byteLength : 0,
    });

    // Derive missing userId via charter if still absent
    if (!userId && charterId) {
      try {
        const charter = await prisma.charter.findUnique({
          where: { id: charterId },
          select: { captain: { select: { userId: true } } },
        });
        userId = charter?.captain.userId;
      } catch {
        /* ignore */
      }
    }
    // Generate final storage keys (captain-scoped media path)
    // Ensure final key uniqueness to avoid collisions when user re-uploads a file with same name.
    const baseName = filename.replace(/\.[^.]+$/, "");
    const ext = filename.includes(".")
      ? filename.slice(filename.lastIndexOf("."))
      : ".mp4";
    const uniqueSuffix = (
      pendingMediaIdRef ||
      originalKeyRef ||
      Date.now().toString(36)
    )
      .toString()
      .slice(-10);
    let finalKey = userId
      ? `captains/${userId}/media/${baseName}-${uniqueSuffix}${ext}`
      : `captains/unknown/media/${baseName}-${uniqueSuffix}${ext}`; // fallback if user unknown
    const thumbnailKey = thumbnail
      ? userId
        ? `captains/${userId}/thumbnails/${filename.replace(
            /\.[^.]+$/,
            thumbnailExt
          )}`
        : null
      : null;

    // Upload compressed video to final location
    let finalUrl: string;
    let firstError: unknown = null;
    try {
      const putRes = await put(finalKey, Buffer.from(compressedVideo), {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: "video/mp4",
      });
      finalUrl = putRes.url;
    } catch (e) {
      firstError = e;
      console.warn(
        "⚠️  TRANSCODE-SIMPLE: First upload attempt failed, retrying with new key",
        {
          finalKey,
          error: e instanceof Error ? e.message : String(e),
          hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
          tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length,
        }
      );
      // Retry once with a fresh unique key
      const retrySuffix = Date.now().toString(36);
      finalKey = userId
        ? `captains/${userId}/media/${baseName}-${retrySuffix}${ext}`
        : `captains/unknown/media/${baseName}-${retrySuffix}${ext}`;
      try {
        const putRes2 = await put(finalKey, Buffer.from(compressedVideo), {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "video/mp4",
        });
        finalUrl = putRes2.url;
        console.log("✅ TRANSCODE-SIMPLE: Retry upload succeeded", {
          finalKey,
        });
      } catch (e2) {
        await fail("upload_final_video_failed", {
          finalKey,
          firstError:
            firstError instanceof Error
              ? firstError.message
              : String(firstError),
          retryError: e2 instanceof Error ? e2.message : String(e2),
          hasToken: !!process.env.BLOB_READ_WRITE_TOKEN,
          tokenLength: process.env.BLOB_READ_WRITE_TOKEN?.length,
        });
        return NextResponse.json(
          { error: "final_upload_failed" },
          { status: 500 }
        );
      }
    }

    console.log("Uploaded compressed video to:", finalKey);

    // Upload thumbnail if generated
    let thumbnailUrl = null;
    if (thumbnail && thumbnailKey) {
      try {
        console.log(
          "⬆️  TRANSCODE-SIMPLE: Uploading thumbnail to:",
          thumbnailKey
        );
        const { url } = await put(thumbnailKey, Buffer.from(thumbnail), {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "image/png",
        });
        thumbnailUrl = url;
        console.log(
          "✅ TRANSCODE-SIMPLE: Uploaded thumbnail to:",
          thumbnailKey,
          "->",
          url
        );
      } catch (error) {
        console.error(
          "❌ TRANSCODE-SIMPLE: Failed to upload thumbnail:",
          error
        );
      }
    } else {
      console.log("⚠️  TRANSCODE-SIMPLE: No thumbnail to upload", {
        hasThumbnail: !!thumbnail,
        hasThumbnailKey: !!thumbnailKey,
      });
    }

    // Update pending media first
    if (pendingMediaId) {
      try {
        console.log("🔄 TRANSCODE-SIMPLE: Updating pending media record", {
          pendingMediaId,
          finalKey,
          finalUrl,
          thumbnailKey,
          thumbnailUrl,
        });
        await prisma.pendingMedia.update({
          where: { id: pendingMediaId },
          data: {
            finalKey,
            finalUrl,
            thumbnailKey: thumbnailKey || undefined,
            thumbnailUrl: thumbnailUrl || undefined,
            durationSeconds: metadata?.durationSeconds,
            width: metadata?.width,
            height: metadata?.height,
            status: "READY",
            error: null,
          },
        });
        console.log("✅ TRANSCODE-SIMPLE: Updated pending media to READY");
      } catch (e) {
        await fail("pending_update_failed", {
          error: e instanceof Error ? e.message : String(e),
        });
        return NextResponse.json(
          { error: "pending_update_failed" },
          { status: 500 }
        );
      }
    }

    // Attach to charter if we have charterId and not yet consumed
    if (charterId && pendingMediaId) {
      try {
        console.log(
          "🔗 TRANSCODE-SIMPLE: Checking if should attach to charter",
          {
            charterId,
            pendingMediaId,
          }
        );
        const updatedPending = await prisma.pendingMedia.findUnique({
          where: { id: pendingMediaId },
          select: { charterMediaId: true },
        });
        console.log("📄 TRANSCODE-SIMPLE: Pending record check", {
          updatedPending,
        });
        if (updatedPending && !updatedPending.charterMediaId) {
          console.log("✅ TRANSCODE-SIMPLE: Creating charter media record");
          const cm = await prisma.charterMedia.create({
            data: {
              charterId,
              kind: "CHARTER_VIDEO",
              url: finalUrl,
              storageKey: finalKey,
              sortOrder: 999,
              thumbnailUrl: thumbnailUrl || undefined,
              durationSeconds: metadata?.durationSeconds,
              width: metadata?.width,
              height: metadata?.height,
              pendingMediaId: pendingMediaId,
            },
            select: { id: true },
          });
          console.log("🔗 TRANSCODE-SIMPLE: Created charter media", {
            charterMediaId: cm.id,
          });
          await prisma.pendingMedia.update({
            where: { id: pendingMediaId },
            data: { consumedAt: new Date(), charterMediaId: cm.id },
          });
          console.log("✅ TRANSCODE-SIMPLE: Linked pending media to charter");
        } else {
          console.log("⚠️  TRANSCODE-SIMPLE: Skipping charter attachment", {
            hasUpdatedPending: !!updatedPending,
            alreadyHasCharterMedia: updatedPending?.charterMediaId,
          });
        }
      } catch (e) {
        console.error("❌ TRANSCODE-SIMPLE: Failed to attach charter media", e);
      }
    } else {
      console.log("⏭️  TRANSCODE-SIMPLE: Skipping charter attachment", {
        hasCharterId: !!charterId,
        hasPendingMediaId: !!pendingMediaId,
      });
    }

    // Clean up original file
    try {
      console.log(
        "🗑️  TRANSCODE-SIMPLE: Cleaning up original file:",
        originalKey
      );
      await del(originalKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
      console.log("✅ TRANSCODE-SIMPLE: Cleaned up original file");
    } catch (error) {
      console.warn(
        "⚠️  TRANSCODE-SIMPLE: Failed to delete original video:",
        originalKey,
        error
      );
    }

    const duration = Date.now() - startTime;
    console.log("🎉 TRANSCODE-SIMPLE: Completed successfully", {
      duration: `${duration}ms`,
      finalUrl,
      finalKey,
      thumbnailUrl,
    });

    return NextResponse.json({ ok: true, finalUrl, finalKey, thumbnailUrl });
  } catch (error) {
    const duration = Date.now() - startTime;
    await fail(
      error instanceof Error ? error.message : "unknown_error_exception",
      { durationMs: duration, originalKey: originalKeyRef }
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcoding failed" },
      { status: 500 }
    );
  }
}
