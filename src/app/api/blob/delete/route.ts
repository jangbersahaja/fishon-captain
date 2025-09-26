import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = getUserId(session);
    if (!userId)
      return applySecurityHeaders(
        NextResponse.json({ error: "unauthorized" }, { status: 401 })
      );

    const json = await req.json().catch(() => null);
    const key = json?.key as string | undefined;
    if (!key)
      return applySecurityHeaders(
        NextResponse.json({ error: "Missing key" }, { status: 400 })
      );

    // Only allow deletion of verification docs owned by this user
    const allowedPrefix = `verification/${userId}/`;
    if (!key.startsWith(allowedPrefix)) {
      return applySecurityHeaders(
        NextResponse.json({ error: "forbidden" }, { status: 403 })
      );
    }

    await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  } catch (e) {
    console.error("Blob delete error", e);
    return applySecurityHeaders(
      NextResponse.json({ ok: false }, { status: 500 })
    );
  }
}
