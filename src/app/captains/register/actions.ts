"use server";

import { prisma } from "@/lib/prisma";

/**
 * Mark a charter media item as transcoded by updating its URL and optional metadata.
 * Intended to be called from the background transcode worker once the 720p file
 * is uploaded back to Blob using the same storageKey.
 */
export async function markMediaTranscoded(params: {
  storageKey: string; // Blob key (must match CharterMedia.storageKey)
  url: string; // Public URL of the optimized file
  sizeBytes?: number | null; // Optional: final file size
  width?: number | null; // Optional: video width
  height?: number | null; // Optional: video height
  mimeType?: string | null; // Optional: e.g. "video/mp4"
}) {
  const { storageKey, url, sizeBytes, width, height, mimeType } = params || {
    storageKey: "",
    url: "",
    sizeBytes: null,
    width: null,
    height: null,
    mimeType: null,
  };

  if (!storageKey || !url) {
    return { ok: false, error: "storageKey and url are required" };
  }

  try {
    const result = await prisma.charterMedia.updateMany({
      where: { storageKey },
      data: {
        url,
        sizeBytes:
          typeof sizeBytes === "number" && Number.isFinite(sizeBytes)
            ? Math.trunc(sizeBytes)
            : undefined,
        width:
          typeof width === "number" && Number.isFinite(width)
            ? Math.trunc(width)
            : undefined,
        height:
          typeof height === "number" && Number.isFinite(height)
            ? Math.trunc(height)
            : undefined,
        mimeType: mimeType ?? undefined,
      },
    });

    return { ok: true, count: result.count };
  } catch (error) {
    console.error("markMediaTranscoded error", error);
    return { ok: false, error: "Failed to mark media as transcoded." };
  }
}

// All other legacy submission helpers removed as finalize endpoint supersedes them.
