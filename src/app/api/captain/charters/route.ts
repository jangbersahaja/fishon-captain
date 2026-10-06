/**
 * GET /api/captain/charters
 *
 * Returns the list of charters owned by the authenticated captain, shaped for
 * the Fishon mobile app (used by the captain charter list + edit entry points).
 *
 * Auth: captain session cookie (next-auth.session-token.captain).
 *
 * Note: the single-charter PATCH endpoints already exist
 * (/api/captain/charters/[id] and .../status); only this list was missing.
 */

import { requireAuth } from "@/lib/api/charter-middleware";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) return authResult.response;
  const { userId } = authResult;

  try {
    const charters = await prisma.charter.findMany({
      where: { ownerId: userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        charterType: true,
        state: true,
        city: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const charterIds = charters.map((c) => c.id);
    const coverByCharter = await getCoverImages(charterIds);

    const result = charters.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      charterType: c.charterType,
      state: c.state,
      city: c.city,
      coverImageUrl: coverByCharter.get(c.id) ?? null,
    }));

    return applySecurityHeaders(NextResponse.json({ charters: result }));
  } catch (error) {
    console.error("[GET /api/captain/charters] error:", error);
    return applySecurityHeaders(
      NextResponse.json({ error: "Failed to load charters" }, { status: 500 })
    );
  }
}

/** Lowest-sortOrder media URL per charter, in one query. */
async function getCoverImages(
  charterIds: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (charterIds.length === 0) return result;

  const media = await prisma.charterMedia.findMany({
    where: { charterId: { in: charterIds } },
    select: { charterId: true, url: true },
    orderBy: { sortOrder: "asc" },
  });

  for (const m of media) {
    if (m.charterId && !result.has(m.charterId)) {
      result.set(m.charterId, m.url);
    }
  }
  return result;
}
