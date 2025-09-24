import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized" }, { status: 401 })
    );

  const body = (await req.json().catch(() => null)) as {
    url: string;
    deleteKey?: string | null;
  } | null;
  if (!body?.url)
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_payload" }, { status: 400 })
    );

  // Try to remove previous avatar blob: prefer explicit deleteKey; otherwise derive from existing DB url
  if (body.deleteKey) {
    await del(body.deleteKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    }).catch(() => {});
  } else {
    const current = await prisma.captainProfile.findUnique({
      where: { userId },
      select: { avatarUrl: true },
    });
    const prevUrl = current?.avatarUrl;
    if (prevUrl && prevUrl !== body.url) {
      try {
        const u = new URL(prevUrl);
        const key = decodeURIComponent(u.pathname.replace(/^\//, ""));
        if (key) {
          await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(
            () => {}
          );
        }
      } catch {
        // ignore parse/delete issues
      }
    }
  }

  await prisma.captainProfile.update({
    where: { userId },
    data: { avatarUrl: body.url },
  });

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
