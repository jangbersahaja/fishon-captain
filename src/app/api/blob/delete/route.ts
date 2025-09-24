import { del } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const key = json?.key as string | undefined;
    if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
    await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Blob delete error", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
