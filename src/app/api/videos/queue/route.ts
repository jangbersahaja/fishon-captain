import authOptions from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/videos/queue { videoId: string }
// Enqueues a normalization job if video is queued.
export async function POST(req: NextRequest) {
  const { videoId } = await req.json().catch(() => ({}));
  if (!videoId)
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });
  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Auth: allow either owner session or worker secret
  const secret = process.env.VIDEO_WORKER_SECRET;
  const authHeader = req.headers.get("authorization");
  let authorized = false;
  if (secret && authHeader === `Bearer ${secret}`) authorized = true;
  if (!authorized) {
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string })?.id;
    if (sessionUserId && sessionUserId === video.ownerId) authorized = true;
  }
  if (!authorized)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (video.processStatus !== "queued") {
    return NextResponse.json({ video, skipped: true });
  }
  await prisma.captainVideo.update({
    where: { id: videoId },
    data: { processStatus: "processing" },
  });

  // Enqueue via QStash if configured, else fallback to internal fetch (synchronous) for dev.
  const target =
    env.EXTERNAL_WORKER_URL ||
    `${env.NEXT_PUBLIC_SITE_URL}/api/videos/worker-normalize`;

  // Prepare payload with all required data for external worker
  const payload = env.EXTERNAL_WORKER_URL
    ? {
        videoId: video.id,
        originalUrl: video.originalUrl,
        trimStartSec: video.trimStartSec || 0,
      }
    : { videoId: video.id }; // Internal worker only needs videoId

  const body = JSON.stringify(payload);

  try {
    if (env.QSTASH_TOKEN && env.QSTASH_URL) {
      // QStash dynamic URL pattern: /v2/publish/{FULL_RAW_DESTINATION_URL}
      // Docs show the raw https://... appended directly (NOT url-encoded). Encoding produces an invalid scheme error.
      // Example: https://qstash.upstash.io/v2/publish/https://your-app.vercel.app/api/worker
      const destination =
        target.startsWith("http://") || target.startsWith("https://")
          ? target
          : `https://${target}`; // ensure scheme
      const publishUrl = `${env.QSTASH_URL}/v2/publish/${destination}`;
      console.log(`[queue] Sending to QStash (raw path) → ${destination}`, {
        payload,
        publishUrl,
      });
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.QSTASH_TOKEN}`,
          "Content-Type": "application/json",
          "Upstash-Forward-Authorization": `Bearer ${process.env.VIDEO_WORKER_SECRET}`,
          "Upstash-Callback": `${env.NEXT_PUBLIC_SITE_URL}/api/videos/normalize-callback`,
          "Upstash-Retries": "2",
        },
        // Body is the actual JSON forwarded to worker
        body,
      });
      let publishText = "";
      try {
        publishText = await publishRes.text();
      } catch {}
      if (!publishRes.ok) {
        console.warn(
          `[queue] QStash publish failed status=${publishRes.status} body=${publishText}`
        );
        // Revert status to queued so can retry
        await prisma.captainVideo.update({
          where: { id: videoId },
          data: {
            processStatus: "queued",
            errorMessage: `qstash_status_${publishRes.status}`,
          },
        });
        return NextResponse.json(
          {
            error: "qstash_publish_failed",
            status: publishRes.status,
            body: publishText,
          },
          { status: 502 }
        );
      }
      console.log(
        `[queue] QStash accepted job for video ${videoId} response=${
          publishText || "<empty>"
        }`
      );
    } else {
      console.log(`[queue] Direct call to ${target}`, payload);
      // Fallback direct call (non-async) for local dev
      await fetch(target, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VIDEO_WORKER_SECRET}`,
        },
        body,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    await prisma.captainVideo.update({
      where: { id: videoId },
      data: { processStatus: "queued", errorMessage: (e as Error).message },
    });
    return NextResponse.json(
      { error: "enqueue_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
