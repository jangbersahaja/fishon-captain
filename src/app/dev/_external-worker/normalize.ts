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

// Try to load ffprobe-static if available, otherwise fluent-ffmpeg will try to use system ffprobe
let ffprobeBinary: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ffprobeBinary = require("ffprobe-static").path;
  console.log("[worker] ffprobe-static loaded:", ffprobeBinary);
} catch {
  console.log("[worker] ffprobe-static not found, will use system ffprobe");
  ffprobeBinary = undefined;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fluent = require("fluent-ffmpeg");

if (ffmpegPath) {
  fluent.setFfmpegPath(ffmpegPath);
  console.log("[worker] ffmpeg path set:", ffmpegPath);
}
if (ffprobeBinary) {
  fluent.setFfprobePath(ffprobeBinary);
  console.log("[worker] ffprobe path set:", ffprobeBinary);
} else {
  console.log(
    "[worker] ffprobe path not set, fluent-ffmpeg will use system PATH"
  );
}

interface Payload {
  videoId?: string;
  originalUrl?: string;
  trimStartSec?: number;
  processedDurationSec?: number | null;
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
  originalWidth: number | null;
  originalHeight: number | null;
  processedWidth: number | null;
  processedHeight: number | null;
}

interface ErrorResult {
  success: false;
  videoId: string | null;
  error: string;
  message: string;
}

type Result = SuccessResult | ErrorResult;

// Unified response helper that works for both Web Fetch API (returning Response)
// and Node/Vercel (writing to res object). We detect style at runtime.
interface NodeResLike {
  statusCode?: number;
  setHeader?: (name: string, value: string) => void;
  end?: (data?: unknown) => void;
}

interface NodeReqLike {
  method?: string;
  headers?: Record<string, string | string | undefined>;
  on?: (event: string, cb: (...args: any[]) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  destroy?: () => void;
}

function isWebRequest(r: unknown): r is Request {
  return typeof Request !== "undefined" && r instanceof Request;
}

function isNodeReq(r: unknown): r is NodeReqLike {
  return !!r && !isWebRequest(r);
}

function makeRespond(webStyle: boolean, nodeRes?: NodeResLike) {
  return (status: number, body: Result) => {
    if (webStyle) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (nodeRes) {
      try {
        nodeRes.statusCode = status;
        nodeRes.setHeader?.("Content-Type", "application/json");
        nodeRes.end?.(JSON.stringify(body));
      } catch (e) {
        // last‑ditch fallback
        console.error("respond_error", e);
      }
    }
    return undefined as unknown as Response; // satisfy TS when node style
  };
}

export const config = { runtime: "nodejs" };

// We export a function that can accept either (req: Request) or (req,res) from Vercel Node runtime
// Accept either a standard Fetch Request or Node request/response pair provided by Vercel node runtime
export default async function handler(
  req: Request | NodeReqLike,
  res?: NodeResLike
) {
  const webStyle = isWebRequest(req);
  const respond = makeRespond(webStyle, res);
  const startedIso = new Date().toISOString();
  const logBase = { scope: "worker-normalize", startedIso } as Record<
    string,
    unknown
  >;

  const started = Date.now();
  const method = webStyle
    ? (req as Request).method
    : (req as NodeReqLike)?.method;
  if (method !== "POST") {
    return respond(405, {
      success: false,
      videoId: null,
      error: "method_not_allowed",
      message: "Use POST",
    });
  }
  // Header access abstraction (case-insensitive)
  let auth: string | undefined;
  try {
    if (webStyle) {
      auth = (req as Request).headers.get("authorization") || undefined;
    } else if (isNodeReq(req) && req.headers) {
      const hdrs = req.headers;
      // normalize keys to lower-case
      for (const k of Object.keys(hdrs)) {
        if (k.toLowerCase() === "authorization") {
          auth = String(hdrs[k]);
          break;
        }
      }
    }
  } catch {}
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return respond(401, {
      success: false,
      videoId: null,
      error: "unauthorized",
      message: "Bad bearer token",
    });
  }
  let payload: Payload = {};
  try {
    if (webStyle) {
      payload = await (req as Request).json();
    } else if (isNodeReq(req)) {
      payload = await new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          let data = "";
          req.on?.("data", (chunk: Buffer) => {
            data += chunk.toString();
            if (data.length > 10 * 1024 * 1024) {
              reject(new Error("payload_too_large"));
              req.destroy?.();
            }
          });
          req.on?.("end", () => {
            if (!data) return resolve({});
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
          req.on?.("error", (err: unknown) => reject(err));
        }
      );
    } else {
      payload = {};
    }
  } catch (e: unknown) {
    console.error("payload_parse_error", {
      ...logBase,
      error: (e as Error)?.message,
    });
    return respond(400, {
      success: false,
      videoId: null,
      error: "invalid_json",
      message: "Body must be JSON",
    });
  }
  const { videoId, originalUrl } = payload;
  let { trimStartSec, processedDurationSec: payloadProcessedDuration } =
    payload;
  if (!videoId || !originalUrl) {
    return respond(400, {
      success: false,
      videoId: videoId || null,
      error: "missing_fields",
      message: "videoId & originalUrl required",
    });
  }
  if (typeof trimStartSec !== "number" || isNaN(trimStartSec)) trimStartSec = 0;
  if (
    typeof payloadProcessedDuration !== "number" ||
    isNaN(payloadProcessedDuration)
  ) {
    payloadProcessedDuration = null;
  }
  if (trimStartSec < 0) trimStartSec = 0;
  if (trimStartSec > 60 * 60 * 3) trimStartSec = 0; // protect from silly values

  const tmpBase = path.join(tmpdir(), `fishon-${videoId}-${randomUUID()}`);
  const inFile = `${tmpBase}-in.mp4`;
  const outFile = `${tmpBase}-out.mp4`;
  // Thumbnail generation removed (handled upstream before worker invocation)

  try {
    // Download original
    const res = await fetch(originalUrl);
    if (!res.ok) {
      return respond(502, {
        success: false,
        videoId,
        error: "download_failed",
        message: `status=${res.status}`,
      });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(inFile, buf);

    // Probe original duration and dimensions (best-effort)
    const originalMetadata = await new Promise<{
      duration: number | null;
      width: number | null;
      height: number | null;
    }>((resolve) => {
      fluent(inFile).ffprobe(
        (
          err: unknown,
          data: {
            format?: { duration?: unknown };
            streams?: Array<{
              codec_type?: string;
              width?: number;
              height?: number;
            }>;
          }
        ) => {
          if (err) {
            console.error("[worker] ffprobe_original_failed", {
              videoId,
              error: (err as Error)?.message || String(err),
              stack: (err as Error)?.stack,
            });
            return resolve({ duration: null, width: null, height: null });
          }
          const durRaw = data?.format?.duration;
          const dur = Number(durRaw);
          const videoStream = data?.streams?.find(
            (s) => s.codec_type === "video"
          );

          console.log("[worker] ffprobe_original_raw_data", {
            videoId,
            hasDuration: !!durRaw,
            hasStreams: !!data?.streams?.length,
            streamCount: data?.streams?.length || 0,
            videoStream: videoStream
              ? {
                  codec_type: videoStream.codec_type,
                  width: videoStream.width,
                  height: videoStream.height,
                }
              : null,
          });

          resolve({
            duration: isFinite(dur) ? dur : null,
            width: videoStream?.width ?? null,
            height: videoStream?.height ?? null,
          });
        }
      );
    });
    const originalDurationSec = originalMetadata.duration;
    const originalWidth = originalMetadata.width;
    const originalHeight = originalMetadata.height;

    console.log("[worker] original_metadata_probed", {
      videoId,
      duration: originalDurationSec,
      width: originalWidth,
      height: originalHeight,
    });

    // Adjust trimStartSec if beyond duration - 0.5s
    if (originalDurationSec && trimStartSec > originalDurationSec - 0.5) {
      trimStartSec = Math.max(0, originalDurationSec - 0.5);
    }

    // Transcode (ensure input added before applying seek to avoid 'No input specified')
    const inStat = await fs.stat(inFile).catch(() => null);
    if (!inStat || inStat.size === 0) {
      throw new Error("input_file_missing_or_empty");
    }
    const seekVal =
      typeof trimStartSec === "number" && trimStartSec > 0 ? trimStartSec : 0;
    const filterAttempts: (string | null)[] = [
      // Attempt 1: cap both dims explicitly (may upscale small videos)
      "scale=1280:720:force_original_aspect_ratio=decrease",
      // Attempt 2: preserve height<=720 and auto width (multiple of 2)
      "scale=-2:720:force_original_aspect_ratio=decrease",
      // Attempt 3: preserve width<=1280 and auto height
      "scale=1280:-2:force_original_aspect_ratio=decrease",
      // Attempt 4: no scaling (fallback)
      null,
    ];

    let transcodeSucceeded = false;
    let lastError: unknown = null;
    // Determine target trim length (cap at 30 even if caller provided larger)
    const targetLength = payloadProcessedDuration
      ? Math.min(30, Math.max(0.1, payloadProcessedDuration))
      : 30;
    for (let i = 0; i < filterAttempts.length && !transcodeSucceeded; i++) {
      const vf = filterAttempts[i];
      const attemptLabel = `attempt_${i + 1}`;
      try {
        await new Promise<void>((resolve, reject) => {
          const cmd = fluent();
          cmd.input(inFile);
          if (seekVal > 0) cmd.seekInput(seekVal);
          const baseOpts = [
            "-t",
            String(targetLength),
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
          ];
          if (vf) baseOpts.push("-vf", vf);
          cmd
            .outputOptions(baseOpts)
            .on("start", (commandLine: string) => {
              console.log("ffmpeg_command", {
                attempt: attemptLabel,
                vf,
                commandLine,
                seekVal,
                targetLength,
              });
            })
            .on("stderr", (line: string) => {
              if (i === filterAttempts.length - 1)
                console.log("ffmpeg_stderr", { attempt: attemptLabel, line });
            })
            .on("error", (e: unknown) => {
              console.error("ffmpeg_transcode_error", {
                attempt: attemptLabel,
                message: (e as Error)?.message,
              });
              reject(e);
            })
            .on("end", () => resolve())
            .save(outFile);
        });
        transcodeSucceeded = true;
      } catch (e) {
        lastError = e;
        // If file was partially written, remove before retry
        await fs.unlink(outFile).catch(() => {});
        console.warn("transcode_attempt_failed", {
          attempt: attemptLabel,
          vf,
          error: (e as Error)?.message,
        });
      }
    }
    if (!transcodeSucceeded) {
      throw lastError || new Error("transcode_failed_all_attempts");
    }

    // Probe processed duration and dimensions
    const processedMetadata = await new Promise<{
      duration: number | null;
      width: number | null;
      height: number | null;
    }>((resolve) => {
      fluent(outFile).ffprobe(
        (
          err: unknown,
          data: {
            format?: { duration?: unknown };
            streams?: Array<{
              codec_type?: string;
              width?: number;
              height?: number;
            }>;
          }
        ) => {
          if (err) {
            console.error("[worker] ffprobe_processed_failed", {
              videoId,
              error: (err as Error)?.message || String(err),
              stack: (err as Error)?.stack,
            });
            return resolve({ duration: null, width: null, height: null });
          }
          const durRaw = data?.format?.duration;
          const dur = Number(durRaw);
          const videoStream = data?.streams?.find(
            (s) => s.codec_type === "video"
          );

          console.log("[worker] ffprobe_processed_raw_data", {
            videoId,
            hasDuration: !!durRaw,
            hasStreams: !!data?.streams?.length,
            streamCount: data?.streams?.length || 0,
            videoStream: videoStream
              ? {
                  codec_type: videoStream.codec_type,
                  width: videoStream.width,
                  height: videoStream.height,
                }
              : null,
          });

          resolve({
            duration: isFinite(dur) ? dur : null,
            width: videoStream?.width ?? null,
            height: videoStream?.height ?? null,
          });
        }
      );
    });
    const processedDurationSec = processedMetadata.duration;
    const processedWidth = processedMetadata.width;
    const processedHeight = processedMetadata.height;

    console.log("[worker] processed_metadata_probed", {
      videoId,
      duration: processedDurationSec,
      width: processedWidth,
      height: processedHeight,
    });

    // Upload video (ensure blob token configured to avoid stream race/ENOENT)
    const blobToken =
      process.env.BLOB_READ_WRITE_TOKEN ||
      process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return respond(500, {
        success: false,
        videoId,
        error: "blob_token_missing",
        message:
          "BLOB_READ_WRITE_TOKEN (or VERCEL_BLOB_READ_WRITE_TOKEN) not set in worker env",
      });
    }
    const normalizedBlobKey = `captain-videos/normalized/${videoId}-720p.mp4`;
    const uploadedVideo = await put(
      normalizedBlobKey,
      createReadStream(outFile),
      { access: "public", contentType: "video/mp4", token: blobToken }
    );

    // Thumbnail skipped; upstream pipeline should supply one already.
    const thumbnailUrl: string | null = null;
    const thumbnailBlobKey: string | null = null;

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
      originalWidth,
      originalHeight,
      processedWidth,
      processedHeight,
    };

    console.log("[worker] sending_result", {
      videoId,
      dimensions: {
        originalWidth,
        originalHeight,
        processedWidth,
        processedHeight,
      },
    });

    return respond(200, result);
  } catch (e: unknown) {
    const message = (e as Error)?.message || "processing_failed";
    console.error("processing_error", {
      ...logBase,
      message,
      stack: (e as Error)?.stack,
    });
    return respond(500, {
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
      // thumbnail file removed (no generation)
    ]);
  }
}
