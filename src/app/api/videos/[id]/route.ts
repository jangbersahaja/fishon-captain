import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const video = await prisma.captainVideo.findUnique({
    where: { id },
  });
  if (!video) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string })?.id;
  if (!sessionUserId || sessionUserId !== video.ownerId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ video });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.captainVideo.findUnique({
      where: { id },
    });
    if (!existing)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    const session = await getServerSession(authOptions);
    const sessionUserId = (session?.user as { id?: string })?.id;
    if (!sessionUserId || sessionUserId !== existing.ownerId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const video = await prisma.captainVideo.delete({
      where: { id },
    });
    const deletes: Promise<unknown>[] = [];
    if (existing.blobKey) deletes.push(del(existing.blobKey).catch(() => null));
    if (
      existing.normalizedBlobKey &&
      existing.normalizedBlobKey !== existing.blobKey
    ) {
      deletes.push(del(existing.normalizedBlobKey).catch(() => null));
    }
    if (existing.thumbnailBlobKey) {
      deletes.push(del(existing.thumbnailBlobKey).catch(() => null));
    }
    Promise.allSettled(deletes).then((r) => {
      const failed = r.filter((x) => x.status === "rejected");
      if (failed.length)
        console.warn("[video delete] blob deletion issues", failed);
    });
    return NextResponse.json({ ok: true, video });
  } catch (e) {
    return NextResponse.json(
      { error: "delete_failed", message: (e as Error).message },
      { status: 400 }
    );
  }
}
