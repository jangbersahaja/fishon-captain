// app/api/jobs/transcode/route.ts
import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

export const runtime = "edge"; // tiny and fast; just queues the job

const qstashToken = process.env.QSTASH_TOKEN;
const qstash = qstashToken ? new Client({ token: qstashToken }) : null;

/**
 * POST /api/jobs/transcode
 *
 * ⚠️ LEGACY ENDPOINT - Used by /api/blob/upload for old video upload flow
 * New code should use /api/videos/queue instead (CaptainVideo pipeline)
 *
 * Queues a video transcoding job via QStash (production) or direct call (dev).
 *
 * @auth None required (called internally by other endpoints)
 *
 * @body {object} TranscodePayload
 * @body.originalKey {string} Blob storage key for original video
 * @body.originalUrl {string} Public URL to download original video
 * @body.filename {string} Original filename for naming outputs
 * @body.userId {string} User ID for captain-scoped storage paths
 * @body.charterId {string} [Optional] Charter ID for association
 *
 * @returns {object} Success response
 * @returns.ok {boolean} Always true if successful
 * @returns.queued {boolean} True if enqueued via QStash
 * @returns.direct {boolean} True if executed directly (dev/fallback)
 *
 * @throws {400} Missing required fields
 * @throws {500} Queue or worker execution failed
 *
 * Flow:
 * 1. Validates payload (supports legacy key/url field names)
 * 2. Determines worker URL from environment
 * 3. Production: Publishes to QStash → /api/workers/transcode
 * 4. Dev/Fallback: Direct call to /api/workers/transcode-simple
 *
 * @see /api/workers/transcode - QStash callback handler
 * @see /api/workers/transcode-simple - Actual processing worker
 * @see /api/videos/queue - Recommended replacement endpoint
 *
 * @deprecated This endpoint supports the legacy blob upload flow.
 *             Migrate to /api/videos/queue for new video uploads.
 */
export async function POST(req: Request) {
  // Log deprecation warning
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "⚠️  /api/jobs/transcode is legacy. Migrate to /api/videos/queue pipeline."
    );
  }
  const body = (await req.json().catch(() => null)) as {
    originalKey?: string;
    originalUrl?: string;
    charterId?: string;
    filename?: string;
    userId?: string;
    pendingMediaId?: string;
    // Legacy support
    key?: string;
    url?: string;
  } | null;

  if (!body?.originalKey && !body?.key) {
    return NextResponse.json({ error: "Missing blob key" }, { status: 400 });
  }

  // Validate and ensure workerUrl has a valid scheme
  const deriveBaseUrl = (): string | null => {
    const trimTrailing = (val: string) => val.replace(/\/+$/, "");
    try {
      const parsed = new URL(req.url);
      if (parsed.origin) {
        return trimTrailing(parsed.origin);
      }
    } catch {
      // ignore
    }
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (envUrl) {
      try {
        const parsed = new URL(envUrl);
        return trimTrailing(parsed.toString());
      } catch {
        // ignore malformed env
      }
    }
    const vercelUrl = process.env.VERCEL_URL?.trim();
    if (vercelUrl) {
      try {
        const parsed = vercelUrl.startsWith("http")
          ? new URL(vercelUrl)
          : new URL(`https://${vercelUrl}`);
        return trimTrailing(parsed.toString());
      } catch {
        // ignore
      }
    }
    const originHeader = req.headers.get("origin");
    if (originHeader) {
      try {
        const parsed = new URL(originHeader);
        return trimTrailing(parsed.toString());
      } catch {
        // ignore invalid origin header
      }
    }
    return null;
  };

  const baseUrl = deriveBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "invalid_site_url" }, { status: 400 });
  }
  const workerUrl = `${baseUrl}/api/workers/transcode`;

  // Detect loopback / local development unsuitable for QStash
  const isLoopback = /localhost|127\.0\.0\.1|::1/.test(workerUrl);
  const canUseQStash = !!qstash && !isLoopback;

  // Normalize the payload for the worker
  const payload = {
    originalKey: body.originalKey || body.key,
    originalUrl: body.originalUrl || body.url,
    charterId: body.charterId,
    filename: body.filename,
    userId: body.userId,
    pendingMediaId: body.pendingMediaId,
  };

  if (canUseQStash) {
    try {
      await qstash!.publishJSON({
        url: workerUrl.replace(/\/worker(s)?\//, "/workers/"),
        body: payload,
      });
      return NextResponse.json({ ok: true, queued: true });
    } catch (e) {
      // Fallback to direct call in dev if publish fails
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn("qstash publish failed, attempting direct fallback", e);
      }
    }
  }

  // Direct fallback: invoke worker endpoint immediately (synchronous local dev path)
  try {
    const direct = await fetch(`${workerUrl}-simple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await direct.text();
    if (!direct.ok) {
      return NextResponse.json(
        {
          error: "queue_failed",
          status: direct.status,
          direct: true,
          body: text,
        },
        { status: direct.status || 502 }
      );
    }
    return NextResponse.json({ ok: true, direct: true, body: text });
  } catch (e) {
    return NextResponse.json(
      { error: "queue_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
