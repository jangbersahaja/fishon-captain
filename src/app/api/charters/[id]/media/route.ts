import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { IncomingMediaSchema } from "@fishon/schemas";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Reuse path pattern logic similar to server/media.ts but localized for images/videos
const mediaKeyPattern = (key: string) => {
  if (key.startsWith("captains/") && key.includes("/media/")) return true; // new standard
  if (key.startsWith("temp/") && key.includes("/original/")) return true; // in-flight video
  if (key.startsWith("charters/") && key.includes("/media/")) return true; // legacy existing
  if (key.startsWith("captain-videos/")) return true; // all video storage paths (normalized, thumbnails, uploads)
  return false;
};

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const adminUserId = url.searchParams.get("adminUserId") || undefined;
  const userRole = (session?.user as { role?: string })?.role;
  const userId = getEffectiveUserId({ session, query: { adminUserId } });
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    select: {
      captain: { select: { userId: true, id: true } },
      media: true,
      id: true,
    },
  });
  if (!charter)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  // Allow access if: user owns the charter OR user is admin with adminUserId parameter
  const isOwner = charter.captain.userId === userId;
  const isAdminBypass = userRole === "ADMIN" && adminUserId;
  if (!isOwner && !isAdminBypass)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const parsed = await req
    .json()
    .then((json) => IncomingMediaSchema.safeParse(json))
    .catch(() => null);
  if (!parsed || !parsed.success) {
    return applySecurityHeaders(
      NextResponse.json(
        { error: "invalid_payload", details: parsed?.error?.issues },
        { status: 400 }
      )
    );
  }
  const body = parsed.data;

  const toDelete = Array.isArray(body.deleteKeys) ? body.deleteKeys : [];

  // Delete requested blobs best-effort
  await Promise.allSettled(
    toDelete.map((key) =>
      del(key, { token: process.env.BLOB_READ_WRITE_TOKEN })
    )
  );

  // Replace charter media with provided images (videos are managed separately in CaptainVideo table)
  const media = body.media ?? { images: [], videos: [] };
  const images = media.images ?? [];

  // Reject if videos are in the payload - videos should not be edited through this route
  if (media.videos && media.videos.length > 0) {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "videos_not_supported",
          message:
            "Videos cannot be edited through this route. They are managed separately.",
        },
        { status: 400 }
      )
    );
  }

  // Get existing storage keys to allow them even if they don't match the new pattern
  const existingStorageKeys = new Set(charter.media.map((m) => m.storageKey));

  // Enforce path pattern for new media (reject non-compliant new keys except legacy existing ones)
  for (const m of images) {
    const mediaName = m.name;
    if (!mediaName) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "invalid_media_path", key: m.name },
          { status: 400 }
        )
      );
    }
    // Allow existing media keys even if they don't match the new pattern (for backward compatibility)
    if (!existingStorageKeys.has(mediaName) && !mediaKeyPattern(mediaName)) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "invalid_media_path", key: m.name },
          { status: 400 }
        )
      );
    }
  }

  // Ensure all required fields are present and non-undefined
  const captainId = charter.captain.id;
  const imageCreates = images.map((m, i) => {
    if (!m.url || !m.name) {
      throw new Error("Missing required image media fields");
    }
    return {
      url: m.url,
      storageKey: m.name,
      sortOrder: i,
      captainId,
    };
  });

  await prisma.$transaction(async (tx) => {
    await tx.charterMedia.deleteMany({ where: { charterId } });
    if (imageCreates.length) {
      await tx.charter.update({
        where: { id: charterId },
        data: {
          media: {
            create: imageCreates,
          },
        },
      });
    }
  });

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
