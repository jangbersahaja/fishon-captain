import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require("fluent-ffmpeg");
// Provide a loose type for ffmpeg-static when types are missing
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import ffmpegStatic from "ffmpeg-static";

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as string);
}

export async function POST(req: NextRequest) {
  const { videoId } = await req.json().catch(() => ({}));
  if (!videoId)
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });
  const secret = process.env.VIDEO_WORKER_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (video.processStatus !== "processing") {
    return NextResponse.json({ video, skipped: true });
  }
  try {
    console.log(
      `[normalize] Processing video ${videoId} with trimStartSec: ${video.trimStartSec}`
    );

    const originalRes = await fetch(video.originalUrl);
    if (!originalRes.ok) throw new Error("download_failed");
    const arrayBuffer = await originalRes.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const tmpInput = `/tmp/${randomUUID()}-in.mp4`;
    const tmpOutput = `/tmp/${randomUUID()}-out.mp4`;
    const fs = await import("node:fs/promises");
    await fs.writeFile(tmpInput, inputBuffer);

    try {
      await new Promise<void>((resolve, reject) => {
        const command = ffmpeg(tmpInput);

        // Apply trim start if specified
        if (video.trimStartSec > 0) {
          command.inputOptions(["-ss", video.trimStartSec.toString()]);
        }

        command
          .outputOptions([
            "-t",
            "30", // Limit output to 30 seconds maximum
            "-vf",
            "scale=iw*min(1280/iw\\,720/ih):ih*min(1280/iw\\,720/ih):force_original_aspect_ratio=decrease",
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
          .on("end", () => resolve())
          .on("error", (err: unknown) => reject(err))
          .save(tmpOutput);
      });

      const outBuffer = await fs.readFile(tmpOutput);
      const normalizedKey = `captain-videos/normalized/${video.id}-720p.mp4`;
      const uploaded = await put(normalizedKey, outBuffer, {
        access: "public",
        contentType: "video/mp4",
      });

      console.log(
        `[normalize] Completed processing for video ${videoId}. Trimmed from ${video.trimStartSec}s for max 30s duration.`
      );

      const updated = await prisma.captainVideo.update({
        where: { id: videoId },
        data: {
          processStatus: "ready",
          ready720pUrl: uploaded.url,
          normalizedBlobKey: normalizedKey,
          errorMessage: null,
        },
      });

      return NextResponse.json({ ok: true, video: updated });
    } finally {
      // Clean up temporary files
      try {
        await fs.unlink(tmpInput).catch(() => {});
        await fs.unlink(tmpOutput).catch(() => {});
      } catch (e) {
        console.warn(`[normalize] Failed to clean up temp files:`, e);
      }
    }
  } catch (e) {
    const updated = await prisma.captainVideo.update({
      where: { id: videoId },
      data: { processStatus: "failed", errorMessage: (e as Error).message },
    });
    return NextResponse.json({ ok: false, video: updated }, { status: 500 });
  }
}
