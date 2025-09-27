import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // no Node deps here

async function isValidSignature(
  req: NextRequest,
  secret: string
): Promise<boolean> {
  const signature = req.headers.get("x-signature");
  if (!signature) return false;

  const body = await req.text(); // Read the raw body as text
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body)
  );
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  const secret = process.env.QSTASH_CURRENT_SIGNING_KEY;
  if (!secret || !(await isValidSignature(req, secret))) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    );
  }

  const body = await req.json();
  // Accept either new (originalKey/originalUrl) or legacy (key/url) field names.
  const originalKey = body.originalKey || body.key;
  const originalUrl = body.originalUrl || body.url;
  if (!originalKey || !originalUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing originalKey/originalUrl" },
      { status: 400 }
    );
  }

  const target = process.env.EXTERNAL_WORKER_URL;
  if (!target) {
    console.log("EXTERNAL_WORKER_URL not configured; using simple transcoding");
    // Use our simple internal transcoding
    const simpleWorkerUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/workers/transcode-simple`;
    const resp = await fetch(simpleWorkerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalKey,
        originalUrl,
        charterId: body.charterId,
        filename: body.filename,
        userId: body.userId,
      }),
    });
    const text = await resp.text();
    return NextResponse.json({ ok: resp.ok, status: resp.status, body: text });
  }

  const resp = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  return NextResponse.json({ ok: resp.ok, status: resp.status, body: text });
}
