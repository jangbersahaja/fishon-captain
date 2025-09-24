// app/api/blob/upload/route.ts
import authOptions from "@/lib/auth";
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

    // Build a readable, unique key
    const original = (file.name || "file").replace(/\s+/g, "_");
    const extMatch = original.match(/\.[A-Za-z0-9]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : "";
    const rand = Math.random().toString(36).slice(2, 8);
    const timestamp = Date.now();
    const charterId = typeof charterIdRaw === "string" ? charterIdRaw : null;

    let key: string;
    if (docType === "charter_media") {
      // Prefer charterId if provided; otherwise store under temp path
      const safeName = `${docType}-${
        charterId ?? `temp-${userId}`
      }-${original}`.slice(0, 180);
      key = charterId
        ? `charters/${charterId}/media/${safeName}`
        : `charters/temp/${userId}/${timestamp}-${rand}-${safeName}`;
    } else if (docType === "charter_avatar") {
      const safeName = `charter_avatar-${userId}-${original}`.slice(0, 180);
      key = `captains/${userId}/avatar/${safeName}`;
    } else {
      const base = `${docType}-${timestamp}-${rand}${ext}`.replace(/\s+/g, "_");
      key = `verification/${userId}/${base}`;
    }

    const { url } = await put(key, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return NextResponse.json({ ok: true, url, key });
  } catch (e: unknown) {
    console.error("Blob upload error", e);
    const errorMessage = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 }
    );
  }
}
