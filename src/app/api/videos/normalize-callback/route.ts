import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Callback endpoint for queue provider to mark completion/failure.
// Expected body: { videoId: string, success: boolean, readyUrl?: string, error?: string }
export async function POST(req: NextRequest) {
  const { videoId, success, readyUrl, error } = await req
    .json()
    .catch(() => ({}));
  if (!videoId)
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });
  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (success) {
    const updated = await prisma.captainVideo.update({
      where: { id: videoId },
      data: {
        processStatus: "ready",
        ready720pUrl: readyUrl || video.originalUrl,
        errorMessage: null,
      },
    });
    return NextResponse.json({ ok: true, video: updated });
  } else {
    const updated = await prisma.captainVideo.update({
      where: { id: videoId },
      data: {
        processStatus: "failed",
        errorMessage: error || "normalize_failed",
      },
    });
    return NextResponse.json({ ok: false, video: updated });
  }
}
