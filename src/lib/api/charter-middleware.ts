/**
 * Shared middleware utilities for charter API routes
 */

import { authOptions } from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export interface CharterAuthResult {
  success: true;
  userId: string;
  charter: {
    id: string;
    captainUserId: string;
  };
}

export interface CharterAuthError {
  success: false;
  response: Response;
}

export type CharterAuthCheckResult = CharterAuthResult | CharterAuthError;

/**
 * Extract user ID from session
 */
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

/**
 * Verify that the charter exists and belongs to the authenticated captain
 * @param charterId - The charter ID to verify
 * @returns Auth result with charter info if successful, error response if not
 */
export async function verifyCharterOwnership(
  charterId: string
): Promise<CharterAuthCheckResult> {
  // Check authentication
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return {
      success: false,
      response: applySecurityHeaders(
        NextResponse.json({ error: "unauthorized" }, { status: 401 })
      ),
    };
  }

  // Verify charter exists and belongs to the captain
  const charter = await prisma.charter.findUnique({
    where: { id: charterId },
    include: {
      captain: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!charter) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "charter_not_found" },
        { status: 404 }
      ),
    };
  }

  if (charter.captain.userId !== userId) {
    return {
      success: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return {
    success: true,
    userId,
    charter: {
      id: charter.id,
      captainUserId: charter.captain.userId,
    },
  };
}

/**
 * Simpler auth check for routes that just need authentication without charter verification
 */
export async function requireAuth(): Promise<
  | { success: true; userId: string }
  | { success: false; response: Response }
> {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);

  if (!userId) {
    return {
      success: false,
      response: applySecurityHeaders(
        NextResponse.json({ error: "unauthorized" }, { status: 401 })
      ),
    };
  }

  return { success: true, userId };
}
