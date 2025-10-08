/*
 * External Worker Template: /api/worker-normalize
 * Copy this file into a standalone Vercel project (Node runtime) under api/worker-normalize.ts
 * (production deployment path: https://fishon-video-worker.vercel.app/api/worker-normalize)
 * to enable 30s trimming + normalization + thumbnail generation.
 */

import { put } from "@vercel/blob";
import ffmpegPath from "ffmpeg-static";
import { randomUUID } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
// ffprobe-static is optional; wrap in try/catch so template works even if dependency not added yet
// (Optional) ffprobe-static may be added in the standalone worker project; here we skip dynamic import to keep template self-contained.
const ffprobeBinary: string | undefined = undefined;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fluent = require("fluent-ffmpeg");

if (ffmpegPath) fluent.setFfmpegPath(ffmpegPath);
if (ffprobeBinary) fluent.setFfprobePath(ffprobeBinary);

interface Payload {
  videoId?: string;
  originalUrl?: string;
  trimStartSec?: number;
}

interface SuccessResult {
  success: true;
  videoId: string;
  readyUrl: string;
  normalizedBlobKey: string;
  thumbnailUrl: string | null;
  thumbnailBlobKey: string | null;
  processingMs: number;
  originalDurationSec: number | null;
  processedDurationSec: number | null;
  appliedTrimStartSec: number;
}

interface ErrorResult {
  success: false;
  videoId: string | null;
  error: string;
  message: string;
}

type Result = SuccessResult | ErrorResult;

function jsonResponse(status: number, body: Result) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const config = { runtime: "nodejs" };

export default async function handler(req: Request) {
  const started = Date.now();
  if (req.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      videoId: null,
      error: "method_not_allowed",
      message: "Use POST",
    });
  }
  const auth = req.headers.get("authorization");
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return jsonResponse(401, {
      success: false,
      videoId: null,
      error: "unauthorized",
      message: "Bad bearer token",
    });
  }
  let payload: Payload = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      videoId: null,
      error: "invalid_json",
      message: "Body must be JSON",
    });
  }
  const { videoId, originalUrl } = payload;
  let { trimStartSec } = payload;
  if (!videoId || !originalUrl) {
    return jsonResponse(400, {
      success: false,
      videoId: videoId || null,
      error: "missing_fields",
      message: "videoId & originalUrl required",
    });
  }
  if (typeof trimStartSec !== "number" || isNaN(trimStartSec)) trimStartSec = 0;
  if (trimStartSec < 0) trimStartSec = 0;
  if (trimStartSec > 60 * 60 * 3) trimStartSec = 0; // protect from silly values

  const tmpBase = path.join(tmpdir(), `fishon-${videoId}-${randomUUID()}`);
  const inFile = `${tmpBase}-in.mp4`;
  const outFile = `${tmpBase}-out.mp4`;
  const thumbFile = `${tmpBase}-thumb.jpg`;

  try {
    // Download original
    const res = await fetch(originalUrl);
    if (!res.ok) {
      return jsonResponse(502, {
        success: false,
        videoId,
        error: "download_failed",
        message: `status=${res.status}`,
      });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(inFile, buf);

    // Probe original duration (best-effort)
    const originalDurationSec = await new Promise<number | null>((resolve) => {
      fluent(inFile).ffprobe((err: unknown, data: unknown) => {
        if (err) return resolve(null);
        const durRaw = (data as { format?: { duration?: unknown } })?.format
          ?.duration;
        const dur = Number(durRaw);
        resolve(isFinite(dur) ? dur : null);
      });
    });

    // Adjust trimStartSec if beyond duration - 0.5s
    if (originalDurationSec && trimStartSec > originalDurationSec - 0.5) {
      trimStartSec = Math.max(0, originalDurationSec - 0.5);
    }

    // Transcode
    await new Promise<void>((resolve, reject) => {
      const cmd = fluent();
      const seekVal =
        typeof trimStartSec === "number" && trimStartSec > 0 ? trimStartSec : 0;
      if (seekVal > 0) cmd.inputOptions(["-ss", seekVal.toString()]);
      cmd
        .input(inFile)
        .outputOptions([
          "-t",
          "30",
          "-vf",
          "scale=iw*min(1280/iw,720/ih):ih*min(1280/iw,720/ih):force_original_aspect_ratio=decrease",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "26",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
        ])
        .on("error", (e: unknown) => reject(e))
        .on("end", () => resolve())
        .save(outFile);
    });

    // Generate thumbnail at 1s into trimmed region (or 0 if very short)
    await new Promise<void>((resolve) => {
      const thumbSeek = 1;
      fluent(outFile)
        .outputOptions(["-vf", "thumbnail", "-frames:v", "1"])
        .seekInput(thumbSeek)
        .on("end", () => resolve())
        .on("error", () => resolve()) // ignore thumb errors
        .save(thumbFile);
    });

    // Probe processed duration
    const processedDurationSec = await new Promise<number | null>((resolve) => {
      fluent(outFile).ffprobe((err: unknown, data: unknown) => {
        if (err) return resolve(null);
        const durRaw = (data as { format?: { duration?: unknown } })?.format
          ?.duration;
        const dur = Number(durRaw);
        resolve(isFinite(dur) ? dur : null);
      });
    });

    // Upload video
    const normalizedBlobKey = `captain-videos/normalized/${videoId}-720p.mp4`;
    const uploadedVideo = await put(
      normalizedBlobKey,
      createReadStream(outFile),
      { access: "public", contentType: "video/mp4" }
    );

    // Upload thumb (optional)
    let thumbnailUrl: string | null = null;
    let thumbnailBlobKey: string | null = null;
    try {
      const thumbStat = await fs.stat(thumbFile).catch(() => null);
      if (thumbStat && thumbStat.size > 100) {
        thumbnailBlobKey = `captain-videos/thumbs/${videoId}.jpg`;
        const uploadedThumb = await put(
          thumbnailBlobKey,
          createReadStream(thumbFile),
          { access: "public", contentType: "image/jpeg" }
        );
        thumbnailUrl = uploadedThumb.url;
      }
    } catch {}

    const result: SuccessResult = {
      success: true,
      videoId,
      readyUrl: uploadedVideo.url,
      normalizedBlobKey,
      thumbnailUrl,
      thumbnailBlobKey,
      processingMs: Date.now() - started,
      originalDurationSec,
      processedDurationSec,
      appliedTrimStartSec: trimStartSec,
    };
    return jsonResponse(200, result);
  } catch (e: unknown) {
    const message = (e as Error)?.message || "processing_failed";
    return jsonResponse(500, {
      success: false,
      videoId,
      error: "ffmpeg_error",
      message,
    });
  } finally {
    // Cleanup
    await Promise.all([
      fs.unlink(inFile).catch(() => {}),
      fs.unlink(outFile).catch(() => {}),
      fs.unlink(thumbFile).catch(() => {}),
    ]);
  }
}
