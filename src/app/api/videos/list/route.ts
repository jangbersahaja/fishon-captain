import { prisma } from "@/lib/prisma";
import { ListQuerySchema } from "@/lib/schemas/video";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId =
    searchParams.get("ownerId") || searchParams.get("userId") || undefined;
  const charterId = searchParams.get("charterId") || undefined;

  console.log("[/api/videos/list] Request:", {
    userId,
    charterId,
    url: req.url,
  });

  // If charterId provided, fetch directly from junction table (no ownerId needed)
  if (charterId) {
    const charterVideos = await prisma.charterVideo.findMany({
      where: { charterId: charterId },
      include: {
        video: true,
      },
      orderBy: { order: "asc" },
    });

    // Transform junction records to video format
    const videos = charterVideos.map((cv) => ({
      ...cv.video,
      order: cv.order, // Include order for potential sorting UI
    }));

    console.log("[/api/videos/list] Returning from CharterVideo junction:", {
      charterId,
      count: videos.length,
      videoIds: videos.map((v) => v.id.substring(0, 8)),
    });

    return NextResponse.json({ videos });
  }

  // No charterId provided - need ownerId to fetch captain's unlinked videos
  const parsed = ListQuerySchema.safeParse({ ownerId: userId });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  if (!parsed.data.ownerId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const captainProfile = await prisma.captainProfile.findUnique({
    where: { userId: parsed.data.ownerId },
    select: { id: true },
  });

  if (!captainProfile) {
    return NextResponse.json({ videos: [] });
  }

  // Return ONLY unlinked videos (videos not associated with any charter)
  // This is for the gallery/video manager when selecting videos to link
  const videos = await prisma.captainVideo.findMany({
    where: {
      captainId: captainProfile.id,
      // Only include videos that have NO CharterVideo junction records
      charters: {
        none: {},
      },
    },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  console.log("[/api/videos/list] Returning unlinked videos (no charterId):", {
    captainId: captainProfile.id,
    count: videos.length,
    videoIds: videos.map((v) => v.id.substring(0, 8)),
  });

  return NextResponse.json({ videos });
}
