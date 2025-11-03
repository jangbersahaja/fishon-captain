import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ReorderVideosSchema = z.object({
  videoOrders: z.array(
    z.object({
      videoId: z.string(),
      order: z.number().int().min(0),
    })
  ),
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
  const parsed = ReorderVideosSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { videoOrders } = parsed.data;

  try {
    // Update all video orders in a transaction
    await prisma.$transaction(
      videoOrders.map(({ videoId, order }) =>
        prisma.charterVideo.updateMany({
          where: {
            charterId: charterId,
            videoId: videoId,
          },
          data: {
            order: order,
          },
        })
      )
    );

    return NextResponse.json({
      ok: true,
      updatedCount: videoOrders.length,
    });
  } catch (error) {
    console.error("Failed to reorder videos:", error);
    return NextResponse.json(
      { error: "db_error", message: (error as Error).message },
      { status: 500 }
    );
  }
}
