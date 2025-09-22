// app/api/blob/upload/route.ts
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure Node (not edge) to handle big bodies
export const maxDuration = 60; // allow larger upload handling if needed

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    // You can prefix keys by user/session etc.
    const key = `uploads/original/${Date.now()}-${file.name.replace(
      /\s+/g,
      "_"
    )}`;

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
