import authOptions from "@/lib/auth";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function GET(
  req: Request,
  ctx: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsValue: { id: string } =
    ctx.params instanceof Promise ? await ctx.params : ctx.params;
  const charterId = paramsValue.id;

  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Get charter and verify ownership
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      captain: { select: { userId: true } },
      media: {
        where: { kind: "CHARTER_VIDEO" },
        select: { url: true, storageKey: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!charter || charter.captain.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Generate thumbnail URLs only for videos in proper charter path
  const videoThumbnails = (
    await Promise.all(
      charter.media
        .filter((video) => {
          const videoKey = video.storageKey || "";
          // Accept either legacy charter-scoped or new captain-scoped paths
          return (
            videoKey.startsWith(`charters/${charterId}/media/`) ||
            (charter.captain.userId &&
              videoKey.startsWith(`captains/${charter.captain.userId}/media/`))
          );
        })
        .map(async (video) => {
          const videoKey = video.storageKey || "";
          // Convert video path to thumbnail path
          const thumbnailKey = videoKey
            .replace("/media/", "/thumbnails/")
            .replace(/\.[^.]+$/, ".jpg");
          const host = env.BLOB_HOSTNAME
            ? `https://${env.BLOB_HOSTNAME}`
            : "https://ldpumtdoplh4cjvk.public.blob.vercel-storage.com";
          const thumbnailUrl = `${host}/${thumbnailKey}`;

          // Optional: verify the thumbnail exists to avoid returning broken URLs
          try {
            const head = await fetch(thumbnailUrl, { method: "HEAD" });
            if (!head.ok) return null;
          } catch {
            return null;
          }

          return {
            videoUrl: video.url,
            videoKey: videoKey,
            thumbnailUrl,
            thumbnailKey,
            sortOrder: video.sortOrder,
          };
        })
    )
  ).filter(Boolean);

  return NextResponse.json({ thumbnails: videoThumbnails });
}
