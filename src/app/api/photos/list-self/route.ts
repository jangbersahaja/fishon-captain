import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/photos/list-self
 *
 * Lists all photos owned by the current user (Phase 2 architecture).
 * Returns all CharterMedia records (photos only) for the authenticated user.
 *
 * This endpoint is used by PhotoGalleryModal to show all user's photos.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessionUserId = (session.user as { id?: string })?.id;
  if (!sessionUserId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  try {
    // Fetch all photos owned by this user (Phase 2: ownerId)
    const photos = await prisma.charterMedia.findMany({
      where: {
        ownerId: sessionUserId,
      },
      select: {
        id: true,
        url: true,
        storageKey: true,
        charterId: true,
        sortOrder: true,
        createdAt: true,
      },
      orderBy: [
        { charterId: "asc" }, // Group by charter
        { sortOrder: "asc" }, // Then by sort order within charter
      ],
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error("[photos/list-self] Error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
