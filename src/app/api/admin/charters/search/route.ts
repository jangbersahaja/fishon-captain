/**
 * Admin Charter Search API
 *
 * GET /api/admin/charters/search?q=<query>
 *
 * Returns charters matching the search query by name, location, or captain name.
 * Used for admin/staff tools like promo code charter restrictions.
 */

import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface CharterSearchResult {
  id: string;
  name: string;
  location: string; // city, state
  captainName: string;
  isActive: boolean;
}

/**
 * GET /api/admin/charters/search
 * Search charters by name, location, or captain name
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
    const includeInactive = searchParams.get("includeInactive") === "true";

    // Build where clause
    const where: Record<string, unknown> = {};

    if (!includeInactive) {
      where.isActive = true;
    }

    if (query) {
      where.OR = [
        // Support exact ID lookup for loading selected items
        { id: query },
        { name: { contains: query, mode: "insensitive" } },
        { city: { contains: query, mode: "insensitive" } },
        { state: { contains: query, mode: "insensitive" } },
        { startingPoint: { contains: query, mode: "insensitive" } },
        {
          captain: {
            displayName: { contains: query, mode: "insensitive" },
          },
        },
        {
          captain: {
            user: {
              name: { contains: query, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const charters = await prisma.charter.findMany({
      where,
      take: limit,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        state: true,
        isActive: true,
        captain: {
          select: {
            displayName: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const results: CharterSearchResult[] = charters.map((charter) => ({
      id: charter.id,
      name: charter.name,
      location: `${charter.city}, ${charter.state}`,
      captainName:
        charter.captain.displayName || charter.captain.user?.name || "Unknown",
      isActive: charter.isActive,
    }));

    return NextResponse.json({ charters: results });
  } catch (error) {
    console.error("[CharterSearchAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to search charters" },
      { status: 500 }
    );
  }
}
