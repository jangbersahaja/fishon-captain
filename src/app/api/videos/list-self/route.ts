import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | null)?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const videos = await prisma.captainVideo.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      originalUrl: true,
      ready720pUrl: true,
      thumbnailUrl: true,
      processStatus: true,
      errorMessage: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ videos });
}
