import { prisma } from "@/lib/prisma";
import { ListQuerySchema } from "@/lib/schemas/video";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId =
    searchParams.get("ownerId") || searchParams.get("userId") || undefined;
  const charterId = searchParams.get("charterId") || undefined;
  const parsed = ListQuerySchema.safeParse({ ownerId: userId });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  // Get captain profile ID from userId
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

  // If charterId provided, filter using junction table
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

    return NextResponse.json({ videos });
  }

  // No charterId: return all captain's videos
  const videos = await prisma.captainVideo.findMany({
    where: { captainId: captainProfile.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ videos });
}
