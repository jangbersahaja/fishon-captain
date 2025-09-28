import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/debug/charter-media?charterId=xxx
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev_only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const charterId = url.searchParams.get("charterId");

  if (!charterId) {
    return NextResponse.json({ error: "charterId required" }, { status: 400 });
  }

  try {
    // Get all charter media for this charter
    const charterMedia = await prisma.charterMedia.findMany({
      where: { charterId },
      orderBy: { createdAt: "desc" },
      include: {
        pendingMedia: {
          select: {
            id: true,
            status: true,
            kind: true,
            originalKey: true,
            finalKey: true,
            thumbnailKey: true,
            consumedAt: true,
            createdAt: true,
          },
        },
      },
    });

    // Get pending media for this charter
    const pendingMedia = await prisma.pendingMedia.findMany({
      where: { charterId },
      orderBy: { createdAt: "desc" },
    });

    // Get charter info
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { name: true, captainId: true },
    });

    return NextResponse.json({
      charter,
      charterMedia,
      pendingMedia,
      stats: {
        totalCharterMedia: charterMedia.length,
        totalPendingMedia: pendingMedia.length,
        pendingWithCharterMedia: pendingMedia.filter((p) => p.charterMediaId)
          .length,
        pendingWithoutCharterMedia: pendingMedia.filter(
          (p) => !p.charterMediaId
        ).length,
      },
    });
  } catch (error) {
    console.error("Debug charter media error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
