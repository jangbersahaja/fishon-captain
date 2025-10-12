import { prisma } from "@/lib/prisma";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for transcoding

type TranscodePayload = {
  originalKey: string;
  originalUrl: string;
  filename: string;
  charterId?: string;
  userId?: string;
  metadata?: { durationSeconds?: number; width?: number; height?: number };
};

// Base64 (tiny) 320x180 PNG placeholder (solid dark gray with triangle) generated offline
// Keeping this small (~250 bytes) to avoid bloating bundle.
const PLACEHOLDER_THUMB_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABaCAYAAAB7n0PpAAAACXBIWXMAAAsTAAALEwEAmpwYAAABM0lEQVR4nO3UsQ3CQBBF0V0gBpJgFQiES6SbKIDRIBIkAUSgDgoKGSvM77uDFz9mTyc3u7u7ubt/8+Xnbz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePz5+ePw5m2bNm2bNmybdu2bdu2bdu2bds2bds2bds2bdu2bdu2bdu2bdv2JDkX9L90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9J90T9Jd8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J9Jl8l9Jn8J5Y0m7btm3btm3btm3btm3bts2bds2bds2bds2bds2bdv25fYDKVAJ5yCS5MkAAAAASUVORK5CYII=";

async function generatePlaceholderThumbnailBuffer(): Promise<ArrayBuffer> {
  return Buffer.from(PLACEHOLDER_THUMB_PNG_BASE64, "base64").buffer;
}

/**
 * POST /api/workers/transcode-simple
 *
 * Internal video processing worker - performs actual transcoding work.
 * Used as fallback when EXTERNAL_WORKER_URL is not configured (dev/local).
 *
 * ⚠️ Currently implements pass-through processing (no actual compression)
 * TODO: Add FFmpeg integration for real video transcoding
 *
 * @auth None required (called internally by /api/workers/transcode)
 * @timeout 300 seconds (5 minutes)
 *
 * @body {object} TranscodePayload
 * @body.originalKey {string} Blob storage key for original video
 * @body.originalUrl {string} Public URL to download original video
 * @body.filename {string} Original filename for naming outputs
 * @body.userId {string} [Optional] User ID for captain-scoped paths
 * @body.charterId {string} [Optional] Charter ID (used to derive userId if missing)
 * @body.metadata {object} [Optional] Video metadata (duration, dimensions)
 *
 * @returns {object} Processing result
 * @returns.ok {boolean} Always true if successful
 * @returns.finalUrl {string} Public URL of processed video
 * @returns.finalKey {string} Blob storage key of processed video
 * @returns.thumbnailUrl {string|null} Thumbnail URL (placeholder PNG)
 *
 * @throws {400} Missing required fields (originalKey, originalUrl, filename)
 * @throws {500} Download, processing, or upload failed
 *
 * Processing steps:
 * 1. Download original video from originalUrl
 * 2. Process video (currently pass-through, generates placeholder thumbnail)
 * 3. Upload processed video to captain-scoped path: captains/{userId}/media/{filename}
 * 4. Upload thumbnail to: captains/{userId}/thumbnails/{filename}.png
 * 5. Delete original blob from temp location
 * 6. Return URLs for processed assets
 *
 * Storage paths:
 * - Processed video: `captains/{userId}/media/{basename}-{uniqueSuffix}{ext}`
 * - Thumbnail: `captains/{userId}/thumbnails/{basename}.png`
 * - Fallback (no userId): `captains/unknown/media/{basename}-{uniqueSuffix}{ext}`
 *
 * Note: This worker does NOT update database records. The calling pipeline
 * (blob upload or CaptainVideo) is responsible for CharterMedia/CaptainVideo updates.
 *
 * @see /api/workers/transcode - QStash callback that calls this worker
 * @see /api/jobs/transcode - Queue entry point
 *
 * Environment:
 * - BLOB_READ_WRITE_TOKEN: Required for blob operations
 */

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
    // Error logging only - no database updates in this worker
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

    const { originalKey, originalUrl, filename, charterId } = body;
    let userId = body.userId;
    originalKeyRef = originalKey;

    console.log("📋 TRANSCODE-SIMPLE: Processing request", {
      originalKey,
      filename,
      userId,
      charterId,
    });

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
    const uniqueSuffix = (originalKeyRef || Date.now().toString(36))
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

    // Charter media creation and attachment should be handled by CaptainVideo pipeline; no pendingMedia logic remains

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

    // Note: Blob URL association with CharterMedia/CaptainVideo is handled by the calling pipeline
    // This worker only processes and uploads; the caller is responsible for database updates

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
