import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/captain/photos?userId=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "missing_userId" }, { status: 400 });
  }
  // Find CaptainProfile for this user
  const captain = await prisma.captainProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!captain) {
    return NextResponse.json({ photos: [] });
  }
  // Find CharterMedia for this captain
  const photos = await prisma.charterMedia.findMany({
    where: {
      captainId: captain.id,
      kind: "CHARTER_PHOTO",
    },
    select: {
      id: true,
      url: true,
      storageKey: true,
      charterId: true,
      createdAt: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ photos });
}
