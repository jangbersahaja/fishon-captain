import { authOptions } from "@/lib/auth";
import { env } from "@/lib/env";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { sendMessageViaAPI } from "@/lib/message-service";
import { rateLimit } from "@/lib/rateLimiter";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * POST /api/messages/send
 *
 * Captain sends a message to a conversation
 * This is a wrapper that calls the fishon-market API
 * Message is stored in fishon-market database
 *
 * Request body:
 * {
 *   conversationId: string
 *   content: string
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   message: Message (if successful)
 *   error?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Verify authentication
    if (!session?.user?.id) {
      return applySecurityHeaders(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      );
    }

    const userId = session.user.id;

    // Rate limit: 30 messages per minute per captain
    const limitResult = await rateLimit({
      key: `message-send:${userId}`,
      max: 30,
      windowMs: 60 * 1000,
    });

    if (!limitResult.allowed) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Rate limit exceeded. Max 30 messages per minute." },
          { status: 429 }
        )
      );
    }

    const body = await request.json();
    const { conversationId, content } = body;

    // Validate inputs
    if (!conversationId || typeof conversationId !== "string") {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "conversationId is required and must be a string" },
          { status: 400 }
        )
      );
    }

    if (
      !content ||
      typeof content !== "string" ||
      content.trim().length === 0
    ) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "content is required and cannot be empty" },
          { status: 400 }
        )
      );
    }

    if (content.length > 10000) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "Message content must be less than 10,000 characters" },
          { status: 400 }
        )
      );
    }

    // Send message via fishon-market API
    const marketApiUrl = env.FISHON_MARKET_API_URL || "http://localhost:3001";
    const message = await sendMessageViaAPI(
      conversationId,
      content.trim(),
      marketApiUrl,
      `captain-${userId}`
    );

    logger.info("Message sent successfully", {
      conversationId,
      captainId: userId,
    });

    return applySecurityHeaders(
      NextResponse.json({
        success: true,
        message,
      })
    );
  } catch (error) {
    logger.error("Error in POST /api/messages/send", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return applySecurityHeaders(
      NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 }
      )
    );
  }
}
