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
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: charterId } = await ctx.params;

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
    },
  });

  if (!charter || charter.captain.userId !== userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  
  // Fetch videos from CaptainVideo table
  const videos = await prisma.captainVideo.findMany({
    where: {
      charterId: charterId,
      processStatus: "ready",
    },
    select: {
      id: true,
      ready720pUrl: true,
      originalUrl: true,
      thumbnailUrl: true,
      blobKey: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Generate thumbnail URLs for videos
  const videoThumbnails = (
    await Promise.all(
      videos
        .filter((video) => {
          const videoKey = video.blobKey || "";
          // Accept either legacy charter-scoped or new captain-scoped paths
          return (
            videoKey.startsWith(`charters/${charterId}/media/`) ||
            (charter.captain.userId &&
              videoKey.startsWith(`captains/${charter.captain.userId}/media/`))
          );
        })
        .map(async (video) => {
          // Use pre-generated thumbnail if available
          if (video.thumbnailUrl) {
            return {
              videoUrl: video.ready720pUrl || video.originalUrl,
              videoKey: video.blobKey || "",
              thumbnailUrl: video.thumbnailUrl,
              thumbnailKey: video.blobKey || "",
              sortOrder: 0, // CaptainVideo doesn't have sortOrder
            };
          }
          
          const videoKey = video.blobKey || "";
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
            videoUrl: video.ready720pUrl || video.originalUrl,
            videoKey: videoKey,
            thumbnailUrl,
            thumbnailKey,
            sortOrder: 0,
          };
        })
    )
  ).filter(Boolean);

  return NextResponse.json({ thumbnails: videoThumbnails });
}
