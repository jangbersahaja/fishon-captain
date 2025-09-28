import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // no Node deps here

async function handler(req: NextRequest) {
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
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin ||
      ""
    ).replace(/\/$/, "");
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: "missing_site_url" },
        { status: 500 }
      );
    }
    // Use our simple internal transcoding
    const simpleWorkerUrl = `${baseUrl}/api/workers/transcode-simple`;
    const resp = await fetch(simpleWorkerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalKey,
        originalUrl,
        charterId: body.charterId,
        filename: body.filename,
        userId: body.userId,
        pendingMediaId: body.pendingMediaId,
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

const requiresSignature = Boolean(process.env.QSTASH_CURRENT_SIGNING_KEY);

export const POST = requiresSignature
  ? verifySignatureAppRouter(handler)
  : (req: NextRequest) => handler(req);
