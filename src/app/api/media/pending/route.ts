import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 0; // always fresh

interface SessionUserShape {
  user?: { id?: string };
}
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionUserShape).user;
  if (!user) return null;
  return typeof user.id === "string" ? user.id : null;
}

// GET /api/media/pending?ids=comma,separated,list or multiple ids params
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.getAll("ids");
    let ids: string[] = [];
    for (const raw of idsParam) {
      if (!raw) continue;
      if (raw.includes(","))
        ids.push(
          ...raw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
      else ids.push(raw.trim());
    }
    // De-duplicate & guard size
    ids = Array.from(new Set(ids)).slice(0, 100);
    if (!ids.length) {
      return NextResponse.json({ ok: true, items: [] });
    }

    const rows = await prisma.pendingMedia.findMany({
      where: { id: { in: ids }, userId },
      select: {
        id: true,
        status: true,
        kind: true,
        finalUrl: true,
        finalKey: true,
        originalKey: true,
        originalUrl: true,
        thumbnailUrl: true,
        durationSeconds: true,
        width: true,
        height: true,
        error: true,
        charterMediaId: true,
        charterId: true,
        consumedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Preserve requested order
    const map = new Map(rows.map((r) => [r.id, r] as const));
    const items = ids.map((id) => map.get(id)).filter(Boolean);
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    console.error("pending media poll error", e);
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
