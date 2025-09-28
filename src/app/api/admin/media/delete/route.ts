import authOptions from "@/lib/auth";
import { del } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserRole(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const role = (user as Record<string, unknown>).role;
  return typeof role === "string" ? role : null;
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = getUserRole(session);
  if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const keysRaw = (body as Record<string, unknown>).keys;
  if (!Array.isArray(keysRaw)) {
    return NextResponse.json({ error: "keys_required" }, { status: 400 });
  }

  const keys = Array.from(
    new Set(
      keysRaw
        .map((k) => (typeof k === "string" ? k.trim() : ""))
        .filter((k) => k.length > 0)
    )
  );
  if (keys.length === 0) {
    return NextResponse.json({ error: "no_keys" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "missing_blob_token" }, { status: 500 });
  }

  const results = await Promise.all(
    keys.map(async (key) => {
      try {
        await del(key, { token });
        return { key, ok: true as const };
      } catch (error) {
        return {
          key,
          ok: false as const,
          error: error instanceof Error ? error.message : "unknown_error",
        };
      }
    })
  );

  const failures = results
    .filter((r) => !r.ok)
    .map((r) => ({
      key: r.key,
      error: r.error ?? "unknown_error",
    }));
  const deleted = results.length - failures.length;

  return NextResponse.json({ ok: failures.length === 0, deleted, failures });
}
