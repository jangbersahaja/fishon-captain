import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { getCaptainConversations } from "@/lib/message-service";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * GET /api/messages/conversations
 *
 * List all conversations for a captain
 * Captain can only see conversations for charters they own
 *
 * Query parameters:
 * - limit: number (1-100, default 20)
 * - cursor: string (for pagination)
 *
 * Response:
 * {
 *   conversations: Conversation[]
 *   nextCursor?: string
 *   hasMore: boolean
 *   totalUnread: number
 * }
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Verify authentication
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limit: 60 requests per minute per captain
    const limitResult = await rateLimit({
      key: `conversations:${userId}`,
      max: 60,
      windowMs: 60 * 1000,
    });

    if (!limitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limit exceeded. Max 60 requests per minute." },
          { status: 429 }
        )
      );
    }

    // Verify user is a captain
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || (user.role !== "CAPTAIN" && user.role !== "ADMIN")) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Only captains can access conversations" },
          { status: 403 }
        )
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor") || undefined;

    let limit = 20;
    if (limitParam) {
      limit = Math.min(Math.max(parseInt(limitParam, 10), 1), 100);
    }

    // Get captain's charters (only their own, unless admin)
    const chartersQuery = user.role === "ADMIN" ? {} : { ownerId: userId };

    const charters = await prisma.charter.findMany({
      where: chartersQuery,
      select: { id: true },
    });

    const charterIds = charters.map((c: { id: string }) => c.id);

    // Get conversations for captain's charters
    const result = await getCaptainConversations(charterIds, limit, cursor);

    logger.info("Captain conversations retrieved", {
      captainId: userId,
      conversationCount: result.conversations.length,
      totalUnread: result.totalUnread,
    });

    return applySecurityHeaders(
      NextResponse.json({
        conversations: result.conversations,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        totalUnread: result.totalUnread,
      })
    );
  } catch (error) {
    logger.error("Error in GET /api/messages/conversations", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json({ error: "Internal server error" }, { status: 500 })
    );
  }
}
