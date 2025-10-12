import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // no Node deps here

/**
 * POST /api/workers/transcode
 *
 * QStash callback handler for video transcoding jobs.
 * Routes requests to external worker (if configured) or internal simple worker.
 *
 * ⚠️ EXTERNAL CONTRACT - Do not change without coordinating worker updates
 *
 * @auth QStash signature verification (if QSTASH_CURRENT_SIGNING_KEY set)
 *
 * @body {object} TranscodePayload
 * @body.originalKey {string} Blob storage key (accepts legacy "key" field)
 * @body.originalUrl {string} Public URL (accepts legacy "url" field)
 * @body.filename {string} Original filename
 * @body.userId {string} User ID for storage paths
 * @body.charterId {string} [Optional] Charter ID
 * @body.pendingMediaId {string} [Optional] Legacy field (ignored)
 *
 * @returns {object} Proxy response from worker
 * @returns.ok {boolean} Worker execution success
 * @returns.status {number} HTTP status from worker
 * @returns.body {string} Worker response body
 *
 * @throws {400} Missing originalKey/originalUrl
 * @throws {401} QStash signature verification failed
 * @throws {500} Missing NEXT_PUBLIC_SITE_URL or worker call failed
 *
 * Routing logic:
 * 1. If EXTERNAL_WORKER_URL set → Forward to external worker
 * 2. Otherwise → Call /api/workers/transcode-simple internally
 *
 * @see /api/jobs/transcode - Queue entry point
 * @see /api/workers/transcode-simple - Internal processing worker
 *
 * Environment:
 * - EXTERNAL_WORKER_URL: Optional external worker endpoint
 * - QSTASH_CURRENT_SIGNING_KEY: Enables signature verification
 * - NEXT_PUBLIC_SITE_URL: Base URL for internal worker calls
 */
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
