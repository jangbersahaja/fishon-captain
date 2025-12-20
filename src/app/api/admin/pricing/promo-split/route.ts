/**
 * Admin API: Promo Split Configuration Management
 *
 * GET /api/admin/pricing/promo-split
 * - Returns current promo split configuration
 * - Requires STAFF or ADMIN role
 *
 * PATCH /api/admin/pricing/promo-split
 * - Updates promo split configuration
 * - Validates percentages (0-100, sum=100)
 * - Invalidates cache
 * - Writes audit log
 * - Requires STAFF or ADMIN role
 */

import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getPromoSplitConfig,
  invalidatePromoSplitCache,
  updatePromoSplitConfig,
} from "@/lib/services/settings-service";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Validation schema for PATCH request
const UpdatePromoSplitSchema = z
  .object({
    captainPercent: z.number().min(0).max(100),
    platformPercent: z.number().min(0).max(100),
  })
  .refine(
    (data) => {
      const sum = data.captainPercent + data.platformPercent;
      return Math.abs(sum - 100) < 0.1; // Allow small floating point differences
    },
    { message: "Captain and platform percentages must sum to 100" }
  );

/**
 * GET - Fetch current promo split configuration
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    // Auth check: STAFF or ADMIN only
    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. STAFF or ADMIN role required." },
        { status: 403 }
      );
    }

    const config = await getPromoSplitConfig();

    logger.info("Admin fetched promo split config", {
      userId: session.user.id,
      role,
      config,
    });

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error("Failed to fetch promo split config", { error });
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update promo split configuration
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    // Auth check: STAFF or ADMIN only
    if (!session?.user || (role !== "STAFF" && role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Unauthorized. STAFF or ADMIN role required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = UpdatePromoSplitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { captainPercent, platformPercent } = validation.data;

    // Update configuration (includes audit logging)
    const updatedConfig = await updatePromoSplitConfig(
      { captainPercent, platformPercent },
      session.user.id as string
    );

    // Invalidate cache to force fresh fetch
    invalidatePromoSplitCache();

    logger.info("Admin updated promo split config", {
      userId: session.user.id,
      role,
      oldConfig: await getPromoSplitConfig(), // Before cache cleared
      newConfig: updatedConfig,
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: "Promo split configuration updated successfully",
    });
  } catch (error) {
    logger.error("Failed to update promo split config", { error });

    // Handle validation errors from service
    if (error instanceof Error && error.message.includes("percentage")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
