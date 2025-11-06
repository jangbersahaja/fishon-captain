import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const LinkVideosSchema = z.object({
  videoIds: z.array(z.string()),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string })?.id;

  if (!sessionUserId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const resolvedParams = await params;
  const charterId = resolvedParams.id;

  // Verify charter exists and belongs to the captain
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      captain: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!charter) {
    return NextResponse.json({ error: "charter_not_found" }, { status: 404 });
  }

  if (charter.captain.userId !== sessionUserId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
        ownerId: sessionUserId,
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
