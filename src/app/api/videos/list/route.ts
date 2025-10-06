import { prisma } from "@/lib/prisma";
import { ListQuerySchema } from "@/lib/schemas/video";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ownerId = searchParams.get("ownerId") || undefined;
  const parsed = ListQuerySchema.safeParse({ ownerId });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }
  const videos = await prisma.captainVideo.findMany({
    where: { ownerId: parsed.data.ownerId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
  return NextResponse.json({ videos });
}
