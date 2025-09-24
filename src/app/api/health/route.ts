import { env } from "@/lib/env";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  try {
    // Lightweight DB ping
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - start;
    return applySecurityHeaders(
      NextResponse.json({
        ok: true,
        uptime: process.uptime(),
        db: { latencyMs: ms },
        env: { node: env.NODE_ENV },
      })
    );
  } catch (e) {
    return applySecurityHeaders(
      NextResponse.json(
        { ok: false, error: (e as Error).message },
        { status: 500 }
      )
    );
  }
}
