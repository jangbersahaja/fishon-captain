import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { verifyApiKey } from "@/lib/api/auth-helpers";
import {
  CHARTER_PUBLIC_INCLUDE,
  transformCharter,
} from "@/lib/api/charter-transform";

export async function GET(req: Request) {
  // Check Bearer token
  const authError = verifyApiKey(req);
  if (authError) return authError;

  // Fetch all active charters with all required nested relations
  const charters = await prisma.charter.findMany({
    where: { isActive: true },
    include: CHARTER_PUBLIC_INCLUDE,
  });

  // Transform charters for API response
  const result = charters.map(transformCharter);

  return applySecurityHeaders(NextResponse.json({ charters: result }));
}
