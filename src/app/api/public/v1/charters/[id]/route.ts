import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api/auth-helpers";
import {
  CHARTER_PUBLIC_INCLUDE,
  transformCharter,
} from "@/lib/api/charter-transform";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Check Bearer token
  const authError = verifyApiKey(req);
  if (authError) return authError;

  // Await params as required by Next.js App Router
  const { id } = await ctx.params;
  const charter = await prisma.charter.findUnique({
    where: { id },
    include: CHARTER_PUBLIC_INCLUDE,
  });

  if (!charter) {
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );
  }

  // Transform charter for API response
  const response = transformCharter(charter);

  return applySecurityHeaders(NextResponse.json({ charter: response }));
}
