/**
 * API Route: Dismiss System Message
 * POST /api/captain/messages/dismiss
 *
 * Marks a system message as dismissed by a captain
 * Prevents message from appearing in dashboard until condition changes
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimiter";
import { withTiming } from "@/lib/requestTiming";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
}

interface SessionShape {
  user?: SessionUser;
}

function getUserId(session: unknown): string | null {
  const s = session as SessionShape;
  return s?.user?.id || null;
}

export async function POST(request: Request) {
  return withTiming("dismiss_message", async () => {
    try {
      // 1. Authentication check
      const session = await getServerSession(authOptions);
      const userId = getUserId(session);

      if (!userId) {
        logger.warn("Unauthorized dismiss message attempt", {
          sessionExists: !!session,
        });
        return applySecurityHeaders(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        );
      }

      // 2. Rate limiting: 10 dismissals per minute per user
      const rateLimitResult = await rateLimit({
        key: `dismiss-message:${userId}`,
        windowMs: 60 * 1000,
        max: 10,
      });

      if (!rateLimitResult.allowed) {
        logger.warn("Rate limit exceeded for dismiss message", {
          userId,
        });
        return applySecurityHeaders(
          NextResponse.json({ error: "Too many requests" }, { status: 429 })
        );
      }

      // 3. Parse request body
      const body = await request.json();
      const { messageId } = body;

      if (!messageId || typeof messageId !== "string") {
        logger.warn("Invalid dismiss message request - missing messageId", {
          userId,
          hasMessageId: !!messageId,
        });
        return applySecurityHeaders(
          NextResponse.json({ error: "messageId is required" }, { status: 400 })
        );
      }

      // 4. Create or update dismissal record
      // Use upsert to handle case where message already dismissed (idempotent)
      const dismissal = await prisma.messageDismissal.upsert({
        where: {
          userId_messageId: {
            userId,
            messageId,
          },
        },
        update: {
          dismissedAt: new Date(),
        },
        create: {
          userId,
          messageId,
          dismissedAt: new Date(),
        },
      });

      logger.info("Message dismissed", {
        userId,
        messageId,
        dismissalId: dismissal.id,
      });

      return applySecurityHeaders(
        NextResponse.json({
          success: true,
          dismissal: {
            id: dismissal.id,
            messageId: dismissal.messageId,
            dismissedAt: dismissal.dismissedAt,
          },
        })
      );
    } catch (error) {
      logger.error("Error dismissing message", {
        error: error instanceof Error ? error.message : String(error),
      });

      return applySecurityHeaders(
        NextResponse.json(
          { error: "Failed to dismiss message" },
          { status: 500 }
        )
      );
    }
  });
}
