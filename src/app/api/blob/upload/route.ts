// app/api/blob/upload/route.ts
import authOptions from "@/lib/auth";
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

    const allowOverwriteRaw = form.get("overwrite");
    const allowOverwrite = allowOverwriteRaw === "true";
    let key: string;
    if (docType === "charter_media") {
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

    // Queue transcoding job for videos
    if (isVideo && charterId && docType === "charter_media") {
      // Create or upsert a temporary DB record referencing the original temp key so UI can reflect pending state
      try {
        await prisma.charterMedia.create({
          data: {
            charterId,
            kind: "CHARTER_VIDEO",
            url, // original temp URL (will be replaced after transcode)
            storageKey: key,
            sortOrder: 999, // appended; ordering can be adjusted after finalization
          },
        });
      } catch (err) {
        // If record exists (e.g., retry), ignore
        console.warn(
          "Temp video record create failed (possible duplicate)",
          err
        );
      }
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
          }),
        });
      } catch (error) {
        console.error("Failed to queue transcode job:", error);
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
