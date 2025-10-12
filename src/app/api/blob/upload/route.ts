// app/api/blob/upload/route.ts
import { MAX_SHORT_VIDEO_BYTES } from "@/config/mediaProcessing";
import authOptions from "@/lib/auth";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export const runtime = "nodejs"; // ensure Node (not edge) to handle big bodies
export const maxDuration = 60; // allow larger upload handling if needed

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const docTypeRaw = form.get("docType");
    const charterIdRaw = form.get("charterId");
    const shortVideo = form.get("shortVideo") === "true"; // new flag for captain short-form videos
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // Sanitize and normalize docType
    const allowed = new Set([
      "idFront",
      "idBack",
      "captainLicense",
      "boatRegistration",
      "fishingLicense",
      "additional",
      "charter_media",
      "charter_avatar",
    ]);
    const docType =
      typeof docTypeRaw === "string" && allowed.has(docTypeRaw)
        ? docTypeRaw
        : "unknown";

    // Sanitize filename for blob storage (preserve original name)
    const originalName = file.name || "file";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 200);
    const timestamp = Date.now();
    const charterId = typeof charterIdRaw === "string" ? charterIdRaw : null;

    // Detect video files for transcoding
    const isVideo = /\.(mp4|mov|webm|ogg|avi|mkv)$/i.test(originalName);
    if (shortVideo && isVideo) {
      if (file.size > MAX_SHORT_VIDEO_BYTES) {
        return NextResponse.json(
          {
            ok: false,
            error: "short_video_too_large",
            maxBytes: MAX_SHORT_VIDEO_BYTES,
            size: file.size,
            message: `Short video exceeds limit of ${Math.round(
              MAX_SHORT_VIDEO_BYTES / 1024 / 1024
            )}MB`,
          },
          { status: 413 }
        );
      }
    }

    const allowOverwriteRaw = form.get("overwrite");
    const allowOverwrite = allowOverwriteRaw === "true";
    let key: string;
    if (shortVideo) {
      // Short-form captain video (already trimmed client-side) stored under dedicated path
      key = `captain-videos/${userId}/${timestamp}-${sanitized}`;
    } else if (docType === "charter_media") {
      if (isVideo && charterId) {
        // Videos go to temp location for transcoding (charter-scoped for uniqueness)
        key = `temp/${charterId}/original/${sanitized}`;
      } else if (charterId) {
        // Images now stored under captain (user) scope to decouple from charter lifecycle
        key = `captains/${userId}/media/${timestamp}-${sanitized}`;
      } else {
        // Fallback for missing charterId (still associate with user)
        key = `captains/${userId}/media/temp-${timestamp}-${sanitized}`;
      }
    } else if (docType === "charter_avatar") {
      // Stable location for avatar; add fingerprint if not allowing overwrite
      if (allowOverwrite) {
        key = `captains/${userId}/avatar/${sanitized}`;
      } else {
        key = `captains/${userId}/avatar/${timestamp}-${sanitized}`;
      }
    } else {
      // For verification docs, add timestamp to avoid conflicts
      key = `verification/${userId}/${timestamp}-${sanitized}`;
    }

    // Defensive: reject any newly crafted legacy charter-scoped media path for images (should not happen via above logic)
    if (!isVideo && /charters\/.+\/media\//.test(key)) {
      return NextResponse.json(
        { error: "legacy_media_path_forbidden", key },
        { status: 400 }
      );
    }

    const { url } = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      // allowOverwrite only meaningful for deterministic keys (avatar when overwrite=true)
      // @vercel/blob put currently respects existing key unless allowOverwrite is passed; if API changes, adjust accordingly.
      ...(allowOverwrite ? { overwrite: true as unknown as undefined } : {}),
    });

    // Enforce charterId for video uploads so we can run temp->transcode pipeline
    if (isVideo && docType === "charter_media" && !charterId) {
      counter("video_upload_rejected_missing_charterId").inc();
      return NextResponse.json(
        {
          ok: false,
          error: "video_requires_charterId",
          message:
            "Video uploads require a charterId (ensure charter is loaded before uploading).",
        },
        { status: 400 }
      );
    }

    if (isVideo && charterId && docType === "charter_media") {
      // Phase 2C: Dual pipeline approach (both legacy + new CaptainVideo pipeline)
      let nextOrder = 0;
      let captainVideoId: string | null = null;

      // Calculate next sort order
      try {
        const max = await prisma.charterMedia.aggregate({
          where: { charterId },
          _max: { sortOrder: true },
        });
        nextOrder = (max._max.sortOrder ?? -1) + 1;
      } catch (e) {
        console.warn(
          "blob upload temp video: failed computing next sortOrder",
          e
        );
      }

      // 1. Create CharterMedia record (backward compatibility with legacy pipeline)
      try {
        await prisma.charterMedia.create({
          data: {
            charterId,
            kind: "CHARTER_VIDEO",
            url, // original temp URL (will be replaced after transcode)
            storageKey: key,
            sortOrder: nextOrder,
          },
        });
      } catch (err) {
        console.warn(
          "Temp video record create failed (possible duplicate after sortOrder logic)",
          err
        );
      }

      // 2. Create CaptainVideo record (NEW - Phase 2C)
      try {
        const captainVideo = await prisma.captainVideo.create({
          data: {
            ownerId: userId,
            originalUrl: url,
            blobKey: key,
            processStatus: "queued",
          },
        });
        captainVideoId = captainVideo.id;

        console.log(
          `[blob-upload] Created CaptainVideo ${captainVideo.id} for user ${userId}`
        );
        counter("captain_video_created").inc();

        // 3. Queue via NEW pipeline (/api/videos/queue)
        try {
          const queueRes = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL}/api/videos/queue`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ videoId: captainVideo.id }),
            }
          );

          if (queueRes.ok) {
            console.log(
              `[blob-upload] Queued CaptainVideo ${captainVideo.id} via new pipeline`
            );
            counter("video_upload_new_pipeline_queued").inc();
          } else {
            const errorText = await queueRes.text();
            console.error(
              `[blob-upload] New pipeline queue failed: ${queueRes.status} ${errorText}`
            );
            counter("video_upload_new_pipeline_queue_fail").inc();
          }
        } catch (queueErr) {
          console.error(
            "[blob-upload] Failed to call /api/videos/queue:",
            queueErr
          );
          counter("video_upload_new_pipeline_queue_fail").inc();
        }
      } catch (captainVideoErr) {
        console.error(
          "[blob-upload] Failed to create CaptainVideo record:",
          captainVideoErr
        );
        counter("captain_video_create_fail").inc();
        // Don't fail the upload - fallback to legacy pipeline only
      }

      // 4. Queue via LEGACY pipeline (keep for now - Phase 2D will remove)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/jobs/transcode`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalKey: key,
            originalUrl: url,
            charterId,
            filename: sanitized,
            userId,
            captainVideoId, // Pass for correlation/debugging
          }),
        });
        counter("video_transcode_jobs_queued").inc();
      } catch (error) {
        console.error("Failed to queue legacy transcode job:", error);
        counter("video_transcode_jobs_queue_fail").inc();
        // Don't fail the upload if transcoding queue fails
      }
    }

    return NextResponse.json({ ok: true, url, key, overwrite: allowOverwrite });
  } catch (e: unknown) {
    console.error("Blob upload error", e);
    const errorMessage = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
