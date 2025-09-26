import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getUser(session: unknown): { id: string; role?: string } | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user as
    | { id?: string; role?: string }
    | undefined;
  if (!user?.id) return null;
  return { id: user.id, role: user.role };
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = getUser(session);
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "forbidden" }, { status: 403 })
    );
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.trim();
  const activeParam = url.searchParams.get("active"); // "1" for active, "0" for inactive, undefined for all
  const page = Math.max(
    1,
    parseInt(url.searchParams.get("page") || "1", 10) || 1
  );
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20)
  );
  const sort = (url.searchParams.get("sort") || "updatedAt") as
    | "name"
    | "updatedAt"
    | "city"
    | "state";
  const order =
    (url.searchParams.get("order") || "desc").toLowerCase() === "asc"
      ? "asc"
      : "desc";

  const where: Prisma.CharterWhereInput = {};
  if (activeParam === "1") where.isActive = true;
  if (activeParam === "0") where.isActive = false;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.CharterOrderByWithRelationInput = {
    [sort]: order,
  } as Prisma.CharterOrderByWithRelationInput;
  const [total, items] = await Promise.all([
    prisma.charter.count({ where }),
    prisma.charter.findMany({
      where,
      orderBy,
      include: { captain: { select: { displayName: true, userId: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return applySecurityHeaders(
    NextResponse.json({
      items: items.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        state: c.state,
        isActive: c.isActive,
        updatedAt: c.updatedAt.toISOString(),
        captain: c.captain,
      })),
      page,
      pageSize,
      total,
    })
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = getUser(session);
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "forbidden" }, { status: 403 })
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );

  const { id, ids, isActive } = body as {
    id?: string;
    ids?: string[];
    isActive?: boolean;
  };
  if (typeof isActive !== "boolean")
    return applySecurityHeaders(
      NextResponse.json({ error: "missing_fields" }, { status: 400 })
    );

  if (Array.isArray(ids) && ids.length > 0) {
    await prisma.charter.updateMany({
      where: { id: { in: ids } },
      data: { isActive },
    });
    return applySecurityHeaders(
      NextResponse.json({ ok: true, count: ids.length })
    );
  }

  if (!id)
    return applySecurityHeaders(
      NextResponse.json({ error: "missing_id" }, { status: 400 })
    );

  await prisma.charter.update({ where: { id }, data: { isActive } });
  return applySecurityHeaders(NextResponse.json({ ok: true, count: 1 }));
}
