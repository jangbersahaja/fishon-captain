/**
 * Public API: Promo Split Configuration
 * GET /api/public/v1/settings/promo-split
 *
 * Returns current captain/platform promo discount split configuration.
 * Used by fishon-market to calculate pricing with dynamic split.
 *
 * This is a READ-ONLY public endpoint. Updates are admin-only via staff UI.
 */

import { getPromoSplitConfig } from "@/lib/services/settings-service";
import { DEFAULT_PROMO_SPLIT } from "@/types/settings";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Always fetch fresh config
export const runtime = "nodejs";

export async function GET() {
  try {
    const config = await getPromoSplitConfig();

    return NextResponse.json({
      success: true,
      data: config,
      cached: false, // fishon-market should cache this
    });
  } catch (error) {
    console.error("Failed to fetch promo split config:", error);

    // Gracefully fall back to default on error
    return NextResponse.json({
      success: true,
      data: DEFAULT_PROMO_SPLIT,
      cached: false,
      fallback: true,
    });
  }
}
