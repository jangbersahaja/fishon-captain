import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { DraftStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface SessionUser {
  role?: string;
}
interface SessionShape {
  user?: SessionUser;
}
function getRole(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionShape).user;
  if (!user || typeof user !== "object") return null;
  return typeof user.role === "string" ? user.role : null;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = getRole(session);
  if (role !== "ADMIN" && role !== "STAFF") {
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );
  }
  // Optional query param ?keepSubmitted=1 to preserve historical SUBMITTED drafts (analytics/backups)
  const url = new URL(req.url);
  const keepSubmitted = url.searchParams.get("keepSubmitted") === "1";
  const where = keepSubmitted
    ? { charterId: { not: null }, status: { not: DraftStatus.SUBMITTED } }
    : { charterId: { not: null } };
  const deleted = await prisma.charterDraft.deleteMany({ where });
  return applySecurityHeaders(
    NextResponse.json({ ok: true, deleted: deleted.count })
  );
}
