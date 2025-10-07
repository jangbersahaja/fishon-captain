// POST /api/blob/finish
// Accepts multipart/form-data with fields matching FinishFormSchema plus thumbnail file.
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FinishFormSchema, validateThumbFile } from "@/lib/schemas/video";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// naive normalize detector (placeholder - real impl would probe via ffprobe)
function needsNormalizePlaceholder(fileName: string): boolean {
  // If filename suggests 720 or less and mp4, assume ok
  if (/720p/i.test(fileName) && /\.mp4$/i.test(fileName)) return false;
  // Default conservative: normalize
  return true;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const videoUrl = form.get("videoUrl");
  const startSec = form.get("startSec");
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
  // If external worker is configured, always normalize to ensure consistent processing
  // Otherwise, skip mp4 files as they're likely already optimized
  const hasExternalWorker = !!process.env.EXTERNAL_WORKER_URL;
  const skip = !hasExternalWorker && /\.mp4$/i.test(parsed.data.videoUrl);
  const normalize =
    !skip &&
    (hasExternalWorker || needsNormalizePlaceholder(parsed.data.videoUrl));

  console.log(`[blob-finish] Processing video:`, {
    videoUrl: parsed.data.videoUrl,
    hasExternalWorker,
    skip,
    normalize,
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
        originalUrl: parsed.data.videoUrl,
        blobKey: typeof blobKey === "string" ? blobKey : null,
        trimStartSec: parsed.data.startSec,
        thumbnailBlobKey: thumbnailBlobKey || null,
        thumbnailUrl,
        processStatus: normalize ? "queued" : "ready",
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
  if (normalize && video) {
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
      normalize,
      hasVideo: !!video,
    });
  }

  return NextResponse.json({ ok: true, video });
}
