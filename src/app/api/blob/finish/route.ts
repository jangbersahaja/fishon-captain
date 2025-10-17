// POST /api/blob/finish
// Accepts multipart/form-data with fields matching FinishFormSchema plus thumbnail file.
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinishFormSchema, validateThumbFile } from "@/lib/schemas/video";
import { put } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import fluentFfmpeg from "fluent-ffmpeg";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
const fluent = fluentFfmpeg; // alias for existing code style
if (ffmpegPath)
  try {
    fluent.setFfmpegPath(ffmpegPath);
  } catch {}

// Removed filename-based heuristic; rely purely on supplied metadata (and future server probing fallback)

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const videoUrl = form.get("videoUrl");
  const startSec = form.get("startSec");
  const endSec = form.get("endSec");
  const width = form.get("width");
  const height = form.get("height");
  const originalDurationSec = form.get("originalDurationSec");
  const ownerIdField = form.get("ownerId");
  const blobKey = form.get("blobKey");
  const didFallbackRaw = form.get("didFallback");
  const fallbackReasonRaw = form.get("fallbackReason");
  const thumb = form.get("thumbnail");

  // Auth & ownership check
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string })?.id;
  if (!sessionUserId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // If client sent an ownerId that doesn't match session, ignore it (do not leak) but do not block legitimate session user.
  const effectiveOwnerId = sessionUserId;

  const parsed = FinishFormSchema.safeParse({
    videoUrl: typeof videoUrl === "string" ? videoUrl : undefined,
    startSec: typeof startSec === "string" ? Number(startSec) : undefined,
    endSec: typeof endSec === "string" ? Number(endSec) : undefined,
    width: typeof width === "string" ? Number(width) : undefined,
    height: typeof height === "string" ? Number(height) : undefined,
    originalDurationSec:
      typeof originalDurationSec === "string"
        ? Number(originalDurationSec)
        : undefined,
    ownerId: typeof ownerIdField === "string" ? ownerIdField : undefined,
    didFallback:
      typeof didFallbackRaw === "string"
        ? didFallbackRaw === "true"
        : undefined,
    fallbackReason:
      typeof fallbackReasonRaw === "string" && fallbackReasonRaw
        ? fallbackReasonRaw.slice(0, 300)
        : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_finish_payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Server-side probe fallback if width/height missing AND we have external worker (or want accurate bypass)
  let probedWidth: number | undefined;
  let probedHeight: number | undefined;
  let probedDuration: number | undefined;
  if (
    (!parsed.data.width || !parsed.data.height) &&
    typeof parsed.data.videoUrl === "string"
  ) {
    try {
      // Probe via fluent-ffmpeg (ffprobe); wrap in promise
      const probeInfo = await new Promise<unknown>((resolve, reject) => {
        try {
          fluent(parsed.data.videoUrl).ffprobe(
            (err: unknown, data: unknown) => {
              if (err) return reject(err);
              resolve(data);
            }
          );
        } catch (e) {
          reject(e);
        }
      });
      const streams =
        (probeInfo as { streams?: Array<Record<string, unknown>> }).streams ||
        [];
      const vStream = streams.find((s) => s.codec_type === "video");
      const w = Number((vStream as { width?: unknown })?.width);
      const h = Number((vStream as { height?: unknown })?.height);
      if (isFinite(w) && w > 0) probedWidth = w;
      if (isFinite(h) && h > 0) probedHeight = h;
      const formatDur = Number(
        (probeInfo as { format?: { duration?: unknown } })?.format?.duration
      );
      if (isFinite(formatDur) && formatDur > 0) probedDuration = formatDur;
      if (probedWidth || probedHeight) {
        console.log("[blob-finish] ffprobe fallback", {
          probedWidth,
          probedHeight,
          probedDuration,
        });
      }
    } catch (e) {
      console.warn("[blob-finish] ffprobe_failed", {
        message: (e as Error).message,
      });
    }
  }

  let thumbnailUrl: string | undefined;
  let thumbnailBlobKey: string | undefined;
  if (thumb instanceof File) {
    if (!validateThumbFile(thumb)) {
      return NextResponse.json({ error: "invalid_thumbnail" }, { status: 400 });
    }
    try {
      const tKey = `captain-videos/thumbs/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.jpg`;
      const uploaded = await put(tKey, thumb, {
        access: "public",
        contentType: thumb.type || "image/jpeg",
      });
      thumbnailUrl = uploaded.url;
      thumbnailBlobKey = tKey;
    } catch (e) {
      console.warn("thumbnail.put_failed", e);
    }
  }
  // Bypass logic:
  // If clip selection (end-start OR full original when endSec missing & startSec=0) <=30s AND resolution <= 1280x720
  // then mark ready immediately. Otherwise normalize if external worker available.
  const hasExternalWorker = !!process.env.EXTERNAL_WORKER_URL;
  let selectionDuration =
    parsed.data.endSec !== undefined && parsed.data.startSec !== undefined
      ? Math.max(0, parsed.data.endSec - parsed.data.startSec)
      : undefined;
  // Fallback: if no endSec but originalDurationSec provided, startSec is 0, and duration <=30, treat whole video as selected
  if (
    selectionDuration === undefined &&
    parsed.data.originalDurationSec !== undefined &&
    parsed.data.startSec === 0 &&
    parsed.data.originalDurationSec <= 30.05
  ) {
    selectionDuration = parsed.data.originalDurationSec;
  }
  const withinDuration =
    selectionDuration !== undefined && selectionDuration <= 30.05; // small epsilon
  // Resolution check: treat any video whose intrinsic dimensions are already <= target (1280x720) as compliant.
  // This includes smaller resolutions like 640x360 (should bypass) and also portrait (e.g., 720x1280 will NOT bypass because height >720).
  // If metadata is partially missing we default to 0 which passes, but duration guard still required.
  const w = parsed.data.width || probedWidth || 0;
  const h = parsed.data.height || probedHeight || 0;
  const withinResolution = w <= 1280 && h <= 720;
  const canBypassViaMetadata = withinDuration && withinResolution;
  const shouldNormalize = !canBypassViaMetadata && hasExternalWorker;

  console.log(`[blob-finish] Processing video:`, {
    videoUrl: parsed.data.videoUrl,
    hasExternalWorker,
    selectionDuration,
    withinDuration,
    withinResolution,
    canBypassViaMetadata,
    shouldNormalize,
  });

  // NOTE: CaptainVideo model may not yet be migrated; wrap in try for now.
  interface CreatedVideo {
    id: string;
    originalUrl: string;
    processStatus: string;
    [k: string]: unknown;
  }
  let video: CreatedVideo | null = null;
  try {
    video = await prisma.captainVideo.create({
      data: {
        ownerId: effectiveOwnerId,
        originalUrl: parsed.data.videoUrl ?? "",
        blobKey: typeof blobKey === "string" ? blobKey : null,
        trimStartSec: parsed.data.startSec,
        originalDurationSec: parsed.data.originalDurationSec || null,
        appliedTrimStartSec: parsed.data.startSec,
        processedDurationSec: selectionDuration || null,
        thumbnailBlobKey: thumbnailBlobKey || null,
        thumbnailUrl,
        processStatus: shouldNormalize ? "queued" : "ready",
        didFallback: parsed.data.didFallback ?? false,
        fallbackReason: parsed.data.fallbackReason,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "db_error", message: (e as Error).message },
      { status: 500 }
    );
  }

  // Optionally enqueue normalize (placeholder - real call to job queue)
  if (shouldNormalize && video) {
    console.log(`[blob-finish] Triggering queue for video ${video.id}`);
    const secret = process.env.VIDEO_WORKER_SECRET;

    // Use the correct base URL for development vs production
    let baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (process.env.NODE_ENV === "development") {
      // Extract port from current request headers
      const host = req.headers.get("host") || "localhost:3000";
      baseUrl = `http://${host}`;
    }

    const queueUrl = `${baseUrl}/api/videos/queue`;
    console.log(`[blob-finish] Calling queue at: ${queueUrl}`);

    fetch(queueUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
      },
      body: JSON.stringify({ videoId: video.id }),
    }).catch((e) => console.warn("enqueue failed", e));
  } else {
    console.log(`[blob-finish] Skipping queue:`, {
      shouldNormalize,
      hasVideo: !!video,
    });
  }

  return NextResponse.json({ ok: true, video });
}
