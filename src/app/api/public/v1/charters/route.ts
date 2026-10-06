import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const state = searchParams.get("state")?.trim();
  const technique = searchParams.get("technique")?.trim();
  const minPrice = parseNumber(searchParams.get("minPrice"));
  const maxPrice = parseNumber(searchParams.get("maxPrice"));

  // Build server-side filters (v1: text/state/technique/price; geo deferred).
  const where: Prisma.CharterWhereInput = { isActive: true };
  const and: Prisma.CharterWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { state: { contains: search, mode: "insensitive" } },
        { startingPoint: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (state) {
    and.push({ state: { contains: state, mode: "insensitive" } });
  }

  if (technique) {
    and.push({
      trips: {
        some: {
          techniques: {
            some: { value: { contains: technique, mode: "insensitive" } },
          },
        },
      },
    });
  }

  if (minPrice !== null || maxPrice !== null) {
    const priceFilter: Prisma.DecimalFilter = {};
    if (minPrice !== null) priceFilter.gte = minPrice;
    if (maxPrice !== null) priceFilter.lte = maxPrice;
    and.push({ trips: { some: { price: priceFilter } } });
  }

  if (and.length > 0) where.AND = and;

  const charters = await prisma.charter.findMany({
    where,
    include: CHARTER_PUBLIC_INCLUDE,
  });

  // Transform charters for API response
  const result = charters.map(transformCharter);

  return applySecurityHeaders(NextResponse.json({ charters: result }));
}

/** Parse a numeric query param; returns null for missing/invalid values. */
function parseNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
