/**
 * Admin Pricing History API
 *
 * GET /api/admin/pricing/history - Fetch price change audit logs
 */

import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const charterId = searchParams.get("charterId");
    const tripId = searchParams.get("tripId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build where clause for audit logs
    const where: any = {
      entityType: "trip",
      action: "pricing.update",
    };

    if (tripId) {
      where.entityId = tripId;
    } else if (charterId) {
      // Need to fetch via before/after JSON since we're filtering by charter
      // This is less efficient but works with the schema
      where.OR = [
        {
          before: {
            path: ["charterId"],
            equals: charterId,
          },
        },
        {
          after: {
            path: ["charterId"],
            equals: charterId,
          },
        },
      ];
    }

    // Fetch audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    // Fetch actor information separately
    const actorIds = [...new Set(auditLogs.map((log) => log.actorUserId))];
    const actors = await prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    });
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    // Format the response
    const changes = auditLogs.map((log) => {
      const before = log.before as any;
      const after = log.after as any;
      const actor = actorMap.get(log.actorUserId);

      return {
        id: log.id,
        timestamp: log.createdAt.toISOString(),
        actorName: actor?.name || "Unknown",
        actorEmail: actor?.email || "",
        tripId: log.entityId,
        tripName: after?.tripName || before?.tripName || "Unknown Trip",
        charterName:
          after?.charterName || before?.charterName || "Unknown Charter",
        before: {
          basePrice: before?.basePrice || 0,
          promoPrice: before?.promoPrice || null,
        },
        after: {
          basePrice: after?.basePrice || 0,
          promoPrice: after?.promoPrice || null,
        },
      };
    });

    return NextResponse.json({
      changes,
      total: changes.length,
    });
  } catch (error) {
    console.error("[PricingHistoryAPI] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
