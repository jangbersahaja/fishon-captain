import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Stub normalization endpoint: marks video as processing then ready (placeholder)
export async function POST(req: NextRequest) {
  const { videoId } = await req.json().catch(() => ({}));
  if (!videoId)
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });

  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (video.processStatus === "ready") return NextResponse.json({ video });

  // Mark processing
  await prisma.captainVideo.update({
    where: { id: videoId },
    data: { processStatus: "processing" },
  });

  // Placeholder fast "normalize" – in real impl enqueue a job and return queued/processing status.
  const updated = await prisma.captainVideo.update({
    where: { id: videoId },
    data: {
      processStatus: "ready",
      ready720pUrl: video.originalUrl, // If normalized we would point to normalized variant
    },
  });
  return NextResponse.json({ video: updated });
}
