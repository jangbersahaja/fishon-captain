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
  const body = JSON.stringify({ videoId });
  try {
    if (env.QSTASH_TOKEN && env.QSTASH_URL) {
      await fetch(`${env.QSTASH_URL}/v2/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.QSTASH_TOKEN}`,
          "Content-Type": "application/json",
          "Upstash-Forward-Authorization": `Bearer ${env.QSTASH_TOKEN}`,
          "Upstash-Callback": `${env.NEXT_PUBLIC_SITE_URL}/api/videos/normalize-callback`,
          "Upstash-Retries": "2",
        },
        body: JSON.stringify({ url: target, body }),
      });
    } else {
      // Fallback direct call (non-async) for local dev
      await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
