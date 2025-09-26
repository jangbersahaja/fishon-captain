import { prisma } from "@/lib/prisma";
import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type TranscodeCompletePayload = {
  originalKey: string;
  transcodedVideoBuffer: ArrayBuffer;
  charterId: string;
  filename: string;
  metadata?: {
    duration?: number;
    width?: number;
    height?: number;
    size?: number;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TranscodeCompletePayload;

    if (
      !body.originalKey ||
      !body.transcodedVideoBuffer ||
      !body.charterId ||
      !body.filename
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const {
      originalKey,
      transcodedVideoBuffer,
      charterId,
      filename,
      metadata,
    } = body;

    // Generate final storage key
    const finalKey = `charters/${charterId}/media/${filename}`;

    // Upload transcoded video to final location
    const { url: finalUrl } = await put(
      finalKey,
      Buffer.from(transcodedVideoBuffer),
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: "video/mp4", // Assuming transcoding outputs MP4
      }
    );

    // Update charter media in database
    await prisma.charter.update({
      where: { id: charterId },
      data: {
        media: {
          create: {
            kind: "CHARTER_VIDEO",
            url: finalUrl,
            storageKey: finalKey,
            sortOrder: 999, // Will be adjusted by user later
          },
        },
      },
    });

    // Clean up original file
    try {
      await del(originalKey, { token: process.env.BLOB_READ_WRITE_TOKEN });
    } catch (error) {
      console.warn("Failed to delete original video:", originalKey, error);
      // Don't fail the request if cleanup fails
    }

    return NextResponse.json({
      ok: true,
      finalUrl,
      finalKey,
      metadata,
    });
  } catch (error) {
    console.error("Transcode completion error:", error);
    return NextResponse.json(
      { error: "Failed to complete transcoding" },
      { status: 500 }
    );
  }
}
