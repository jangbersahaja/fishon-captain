import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/charters/[id]/photos/link
 *
 * Links selected photos to a charter by updating their charterId.
 * Phase 2 architecture: validates photos belong to user via ownerId.
 *
 * Body: { photoIds: string[] }
 *
 * Process:
 * 1. Validate all photoIds belong to the authenticated user
 * 2. Unlink all existing photos from this charter
 * 3. Link selected photos to this charter
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sessionUserId = (session.user as { id?: string })?.id;
  if (!sessionUserId) {
    return NextResponse.json({ error: "missing_user_id" }, { status: 400 });
  }

  const { id: charterId } = await params;
  if (!charterId) {
    return NextResponse.json({ error: "missing_charter_id" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { photoIds } = body;

    if (!Array.isArray(photoIds)) {
      return NextResponse.json({ error: "invalid_photo_ids" }, { status: 400 });
    }

    // Verify charter exists and user owns it
    const charter = await prisma.charter.findUnique({
      where: { id: charterId },
      select: { id: true, ownerId: true },
    });

    if (!charter) {
      return NextResponse.json({ error: "charter_not_found" }, { status: 404 });
    }

    if (charter.ownerId !== sessionUserId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    // Validate all photos belong to the user
    if (photoIds.length > 0) {
      const photos = await prisma.charterMedia.findMany({
        where: {
          id: { in: photoIds },
          ownerId: sessionUserId, // Phase 2: validate by ownerId
        },
        select: { id: true },
      });

      if (photos.length !== photoIds.length) {
        return NextResponse.json(
          {
            error: "invalid_photo_ids",
            message: "Some photos do not belong to the user",
          },
          { status: 400 }
        );
      }
    }

    // Transaction: unlink all, then link selected
    await prisma.$transaction(async (tx) => {
      // Unlink all photos from this charter (set charterId to null)
      await tx.charterMedia.updateMany({
        where: {
          charterId: charterId,
          ownerId: sessionUserId,
        },
        data: {
          charterId: null,
          sortOrder: 0,
        },
      });

      // Link selected photos to this charter with sortOrder
      if (photoIds.length > 0) {
        await Promise.all(
          photoIds.map((photoId, index) =>
            tx.charterMedia.update({
              where: { id: photoId },
              data: {
                charterId: charterId,
                sortOrder: index,
              },
            })
          )
        );
      }
    });

    return NextResponse.json({
      success: true,
      linkedCount: photoIds.length,
    });
  } catch (error) {
    console.error("[charters/photos/link] Error:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
