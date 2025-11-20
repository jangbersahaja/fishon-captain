import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCharterOwnership } from "@/lib/api/charter-middleware";

const LinkVideosSchema = z.object({
  videoIds: z.array(z.string()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const charterId = resolvedParams.id;

  // Verify charter ownership
  const authResult = await verifyCharterOwnership(charterId);
  if (!authResult.success) {
    return authResult.response;
  }

  // Parse request body
  const body = await req.json();
  const parsed = LinkVideosSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { videoIds } = parsed.data;

  try {
    // Phase 2: Get all user's videos by ownerId (not captainId)
    const userVideos = await prisma.captainVideo.findMany({
      where: {
        ownerId: authResult.userId,
      },
      select: {
        id: true,
      },
    });

    const userVideoIds = new Set(userVideos.map((v) => v.id));

    // Verify all provided video IDs belong to this user
    const invalidIds = videoIds.filter((id) => !userVideoIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "invalid_video_ids", invalidIds },
        { status: 400 }
      );
    }

    // Transaction: Delete all existing links, then create new links
    await prisma.$transaction([
      // First, remove all existing video links for this charter
      prisma.charterVideo.deleteMany({
        where: {
          charterId: charterId,
        },
      }),
      // Then, create new links with sequential ordering
      prisma.charterVideo.createMany({
        data: videoIds.map((videoId, index) => ({
          charterId: charterId,
          videoId: videoId,
          order: index,
        })),
        skipDuplicates: true,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      linkedCount: videoIds.length,
    });
  } catch (error) {
    console.error("Failed to link videos:", error);
    return NextResponse.json(
      { error: "db_error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
