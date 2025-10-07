import { env } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { videoId, originalUrl } = await req.json().catch(() => ({}));

  if (!videoId || !originalUrl) {
    return NextResponse.json(
      { error: "missing_videoId_or_url" },
      { status: 400 }
    );
  }

  const workerUrl = env.EXTERNAL_WORKER_URL;
  const secret = process.env.VIDEO_WORKER_SECRET;

  if (!workerUrl || !secret) {
    return NextResponse.json(
      {
        error: "worker_not_configured",
        hasWorkerUrl: !!workerUrl,
        hasSecret: !!secret,
      },
      { status: 500 }
    );
  }

  try {
    console.log(`[test-worker] Sending job to ${workerUrl}`);

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId, originalUrl, trimStartSec: 0 }),
    });

    const result = await response.json();

    console.log(`[test-worker] Worker response:`, {
      status: response.status,
      result,
    });

    return NextResponse.json({
      workerStatus: response.status,
      workerResponse: result,
      requestSent: { videoId, originalUrl },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[test-worker] Error:`, error);
    return NextResponse.json(
      {
        error: "worker_request_failed",
        message,
      },
      { status: 500 }
    );
  }
}
