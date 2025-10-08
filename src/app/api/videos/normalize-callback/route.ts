import { prisma } from "@/lib/prisma";
import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";

interface WorkerResultPayload {
  videoId?: string;
  success?: boolean; // explicit success
  ok?: boolean; // alias some workers use
  readyUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  processingMs?: number;
  originalDurationSec?: number;
  processedDurationSec?: number;
  appliedTrimStartSec?: number;
  normalizedBlobKey?: string;
  thumbnailBlobKey?: string;
}

const STRICT_SIGNATURE = process.env.STRICT_QSTASH_SIGNATURE === "1";

export async function POST(req: NextRequest) {
  let raw = "";
  try {
    raw = await req.text();
  } catch (e) {
    return NextResponse.json(
      { error: "body_read_failed", message: (e as Error).message },
      { status: 400 }
    );
  }

  // Signature verification (optional strict mode)
  const sig = req.headers.get("upstash-signature");
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (sig && currentKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey || currentKey,
      });
      const valid = await receiver.verify({ body: raw, signature: sig });
      if (!valid) {
        if (STRICT_SIGNATURE) {
          return NextResponse.json(
            { error: "invalid_signature" },
            { status: 401 }
          );
        }
        console.warn("[normalize-callback] invalid signature (soft)");
      }
    } catch (e) {
      if (STRICT_SIGNATURE) {
        return NextResponse.json(
          { error: "signature_verification_failed" },
          { status: 401 }
        );
      }
      console.warn(
        "[normalize-callback] signature error (soft)",
        (e as Error).message
      );
    }
  } else if (!sig && STRICT_SIGNATURE && currentKey) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  // Parse outer JSON
  let outer: Record<string, unknown> = {};
  try {
    outer = raw ? JSON.parse(raw) : {};
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_json", message: (e as Error).message },
      { status: 400 }
    );
  }

  // If debug query parameter present, short-circuit
  const debug = new URL(req.url).searchParams.get("debug") === "1";

  // Detect & decode envelope body (base64)
  let payload: WorkerResultPayload = {};
  if (outer && typeof outer === "object" && outer.videoId) {
    payload = outer; // direct worker JSON
  } else if (outer && typeof outer.body === "string") {
    // Try base64 then JSON
    const b64 = outer.body.trim();
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      const inner = JSON.parse(decoded);
      if (inner && typeof inner === "object") {
        payload = inner;
      }
    } catch {
      // fallback: maybe plain JSON string
      try {
        payload = JSON.parse(outer.body);
      } catch {
        // leave empty
      }
    }
  } else if (outer && typeof outer.response === "object") {
    // Some formats: { response: { body: base64 }}
    const resp = outer.response as Record<string, unknown>;
    if (resp.body && typeof resp.body === "string") {
      try {
        const decoded = Buffer.from(resp.body as string, "base64").toString(
          "utf8"
        );
        payload = JSON.parse(decoded) as WorkerResultPayload;
      } catch {}
    }
  }

  // Derive success boolean
  let success: boolean | undefined =
    typeof payload.success === "boolean" ? payload.success : undefined;
  if (success === undefined && typeof payload.ok === "boolean") {
    success = payload.ok;
  }

  // Derive videoId from URLs if absent
  let videoId = payload.videoId;
  if (!videoId && payload.readyUrl) {
    const m = payload.readyUrl.match(/normalized\/([^/]+?)-720p\.mp4/);
    if (m) videoId = m[1];
  }
  if (!videoId && payload.thumbnailUrl) {
    const m = payload.thumbnailUrl.match(/thumbnails\/([^/]+)\.jpg/);
    if (m) videoId = m[1];
  }

  if (debug) {
    return NextResponse.json({
      debug: { outerKeys: Object.keys(outer || {}), payload, videoId, success },
    });
  }

  if (!videoId) {
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });
  }

  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Idempotency: if already ready and incoming success, merge missing fields
  if (success === true && video.processStatus === "ready") {
    const needsUpdate =
      !video.ready720pUrl ||
      !video.thumbnailUrl ||
      (payload.normalizedBlobKey && !video.normalizedBlobKey) ||
      (payload.originalDurationSec && !video.originalDurationSec) ||
      (payload.processedDurationSec && !video.processedDurationSec);
    if (needsUpdate) {
      const baseUpdate = {
        ready720pUrl:
          payload.readyUrl || video.ready720pUrl || video.originalUrl,
        thumbnailUrl: payload.thumbnailUrl || video.thumbnailUrl,
      } as const;
      let updated;
      try {
        updated = await prisma.captainVideo.update({
          where: { id: videoId },
          data: baseUpdate,
        });
      } catch (e) {
        console.warn(
          "[normalize-callback] partial update failed",
          (e as Error).message
        );
        updated = video;
      }
      return NextResponse.json({ ok: true, video: updated, idempotent: true });
    }
    return NextResponse.json({ ok: true, video, idempotent: true });
  }

  try {
    if (success === true) {
      const updated = await prisma.captainVideo.update({
        where: { id: videoId },
        data: {
          processStatus: "ready",
          ready720pUrl: payload.readyUrl || video.originalUrl,
          thumbnailUrl: payload.thumbnailUrl || video.thumbnailUrl,
          errorMessage: null,
        },
      });
      console.log("[normalize-callback] success", { videoId });
      return NextResponse.json({ ok: true, video: updated });
    }
    if (success === false) {
      const updated = await prisma.captainVideo.update({
        where: { id: videoId },
        data: {
          processStatus: "failed",
          errorMessage: payload.error || "normalize_failed",
        },
      });
      console.log("[normalize-callback] failure", {
        videoId,
        error: payload.error,
      });
      return NextResponse.json({ ok: false, video: updated });
    }
    return NextResponse.json(
      {
        error: "missing_success_flag",
        message: "success (or ok) boolean required",
      },
      { status: 400 }
    );
  } catch (e) {
    console.error("[normalize-callback] db_update_error", (e as Error).message);
    return NextResponse.json(
      { error: "db_update_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
