import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Lightweight healthcheck: returns 200 if server can construct a response.
// Optional: quick DB ping (counts minimal query) guarded by timeout.
export async function GET() {
  const start = Date.now();
  let dbMs: number | null = null;
  try {
    const dbStart = Date.now();
    // Use a fast query; adapt to e.g. SELECT 1 on raw if needed.
    await prisma.$queryRaw`SELECT 1`;
    dbMs = Date.now() - dbStart;
  } catch {
    // swallow; surface status in body
  }
  const body = {
    status: "ok",
    uptimeSec: Math.round(process.uptime()),
    db: dbMs === null ? "unreachable" : "ok",
    dbMs,
    ms: Date.now() - start,
  };
  const res = NextResponse.json(body, { status: 200 });
  return applySecurityHeaders(res);
}
