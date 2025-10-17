import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

interface SessionUserShape {
  user?: { id?: string };
}
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionUserShape).user;
  return user && typeof user.id === "string" ? user.id : null;
}

// POST /api/media/photo
// Simple direct photo upload (resized client-side already). Creates CharterMedia immediately if charterId provided.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const charterId =
      typeof form.get("charterId") === "string"
        ? (form.get("charterId") as string)
        : null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "not_image" }, { status: 400 });
    }
    const originalName = file.name || "photo";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 160);
    const ts = Date.now();
    const storageKey = `captains/${userId}/media/${ts}-${sanitized}`;
    const putRes = await put(storageKey, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });

    // CharterMedia creation: always create, use temp charterId for drafts
    // Get CaptainProfile for captainId
    const draftIdRaw = form.get("draftId");
    const draftId = typeof draftIdRaw === "string" ? draftIdRaw : null;
    const profile = await prisma.captainProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "captain_profile_not_found",
          message:
            "CaptainProfile not found for user. Please complete onboarding.",
        },
        { status: 400 }
      );
    }
    // Only set charterId if a real charter exists, else null
    const charterIdFinal = charterId || null;
    // Compute next sortOrder (if charterIdFinal is set, else default 0)
    let nextOrder = 0;
    if (charterIdFinal) {
      try {
        const max = await prisma.charterMedia.aggregate({
          where: { charterId: charterIdFinal },
          _max: { sortOrder: true },
        });
        nextOrder = (max._max.sortOrder ?? -1) + 1;
      } catch (e) {
        console.warn(
          "photo upload: failed to compute next sortOrder, defaulting 0",
          e
        );
      }
    }
    // Create CharterMedia record
    const cm = await prisma.charterMedia.create({
      data: {
        captainId: profile.id,
        charterId: charterIdFinal, // will be null if no real charter
        kind: "CHARTER_PHOTO",
        url: putRes.url,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        sortOrder: nextOrder,
      },
      select: { id: true },
    });
    return NextResponse.json({
      ok: true,
      url: putRes.url,
      key: storageKey,
      charterMediaId: cm.id,
    });
  } catch (e) {
    console.error("photo upload error", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
