import { prisma } from "@/lib/prisma";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for transcoding

type TranscodePayload = {
  originalKey: string;
  originalUrl: string;
  charterId: string;
  filename: string;
};

// Simple video compression and thumbnail generation
async function processVideo(videoBuffer: ArrayBuffer): Promise<{
  compressedVideo: ArrayBuffer;
  thumbnail: ArrayBuffer | null;
}> {
  // For now, we'll just pass through the video
  // In a real implementation, you'd use FFmpeg to:
  // 1. Compress the video (reduce bitrate, optimize encoding)
  // 2. Generate a thumbnail at 1-2 seconds into the video
  // 3. Optimize for web streaming

  try {
    // Placeholder for thumbnail generation
    // In production, use FFmpeg: ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 -q:v 2 thumbnail.jpg
    const thumbnail = await generatePlaceholderThumbnail();

    return {
      compressedVideo: videoBuffer, // Pass through for now
      thumbnail,
    };
  } catch (error) {
    console.warn("Thumbnail generation failed:", error);
    return {
      compressedVideo: videoBuffer,
      thumbnail: null,
    };
  }
}

// Generate a simple placeholder thumbnail until we implement FFmpeg
async function generatePlaceholderThumbnail(): Promise<ArrayBuffer> {
  // Create a simple 320x180 thumbnail with video icon
  // This is a placeholder - in production, extract actual frame from video

  const canvas = new OffscreenCanvas(320, 180);
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not create canvas context");

  // Draw a simple thumbnail background
  ctx.fillStyle = "#1f2937"; // Gray background
  ctx.fillRect(0, 0, 320, 180);

  // Draw play button icon
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(120, 60);
  ctx.lineTo(120, 120);
  ctx.lineTo(180, 90);
  ctx.closePath();
  ctx.fill();

  // Add "Video" text
  ctx.fillStyle = "#ffffff";
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("Video Preview", 160, 150);

  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  return await blob.arrayBuffer();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranscodePayload;

    if (
      !body.originalKey ||
      !body.originalUrl ||
      !body.charterId ||
      !body.filename
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { originalKey, originalUrl, charterId, filename } = body;

    console.log("Starting transcode for:", filename);

    // Download the original video
    const videoResponse = await fetch(originalUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const originalBuffer = await videoResponse.arrayBuffer();
    console.log("Downloaded video size:", originalBuffer.byteLength);

    // Process video (compress and generate thumbnail)
    const { compressedVideo, thumbnail } = await processVideo(originalBuffer);
    console.log("Compressed video size:", compressedVideo.byteLength);

    // Generate final storage keys
    const finalKey = `charters/${charterId}/media/${filename}`;
    const thumbnailKey = thumbnail
      ? `charters/${charterId}/thumbnails/${filename.replace(
          /\.[^.]+$/,
          ".jpg"
        )}`
      : null;

    // Upload compressed video to final location
    const { url: finalUrl } = await put(
      finalKey,
      Buffer.from(compressedVideo),
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: "video/mp4",
      }
    );

    console.log("Uploaded compressed video to:", finalKey);

    // Upload thumbnail if generated
    let thumbnailUrl = null;
    if (thumbnail && thumbnailKey) {
      try {
        const { url } = await put(thumbnailKey, Buffer.from(thumbnail), {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: "image/jpeg",
        });
        thumbnailUrl = url;
        console.log("Uploaded thumbnail to:", thumbnailKey);
      } catch (error) {
        console.warn("Failed to upload thumbnail:", error);
      }
    }

    // Persist final video location in DB by replacing the temp/original record
    try {
      const updated = await prisma.charterMedia.updateMany({
        where: { charterId, storageKey: originalKey, kind: "CHARTER_VIDEO" },
        data: { url: finalUrl, storageKey: finalKey },
      });
      if (updated.count === 0) {
        // If no existing temp record, create a new one at the end
        await prisma.charter.update({
          where: { id: charterId },
          data: {
            media: {
              create: {
                kind: "CHARTER_VIDEO",
                url: finalUrl,
                storageKey: finalKey,
                sortOrder: 999,
              },
            },
          },
        });
      }
    } catch (error) {
      console.warn("Failed to persist final video in DB:", error);
    }

    // Clean up original file
    try {
      await del(originalKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
      console.log("Cleaned up original file:", originalKey);
    } catch (error) {
      console.warn("Failed to delete original video:", originalKey, error);
    }

    return NextResponse.json({
      ok: true,
      finalUrl,
      finalKey,
      thumbnailUrl,
      originalSize: originalBuffer.byteLength,
      compressedSize: compressedVideo.byteLength,
    });
  } catch (error) {
    console.error("Transcoding error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transcoding failed" },
      { status: 500 }
    );
  }
}
