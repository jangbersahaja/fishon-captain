/**
 * Shared utilities for proxying requests to fishon-market API
 */

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

/**
 * Check if market API is configured
 */
export function checkMarketApiConfig(): {
  market: string;
  secret: string;
} | null {
  const market = process.env.FISHON_MARKET_API_URL;
  const secret = process.env.CAPTAIN_API_SECRET;
  
  if (!market || !secret) {
    return null;
  }
  
  return { market, secret };
}

/**
 * Proxy a request to the fishon-market API
 * @param req - The incoming request
 * @param endpoint - The market API endpoint path (e.g., "/api/bookings/approve")
 * @param options - Additional options
 * @returns Response from the market API
 */
export async function proxyToMarketApi(
  req: Request,
  endpoint: string,
  options: {
    requireAuth?: boolean;
  } = {}
): Promise<Response> {
  const { requireAuth = true } = options;

  // Check authentication if required
  if (requireAuth) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Check market API configuration
  const config = checkMarketApiConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Market API not configured" },
      { status: 500 }
    );
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));

  // Forward request to market API
  const res = await fetch(`${config.market}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-captain-api-secret": config.secret,
    },
    body: JSON.stringify(body),
  });

  // Handle error response
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  }

  // Return successful response
  return NextResponse.json(await res.json());
}

/**
 * Proxy a request to the market API with simple success response
 * Same as proxyToMarketApi but returns { ok: true } for successful responses
 */
export async function proxyToMarketApiSimple(
  req: Request,
  endpoint: string
): Promise<Response> {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check market API configuration
  const config = checkMarketApiConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Market API not configured" },
      { status: 500 }
    );
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));

  // Forward request to market API
  const res = await fetch(`${config.market}${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-captain-api-secret": config.secret,
    },
    body: JSON.stringify(body),
  });

  // Handle error response
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  }

  // Return simple success response
  return NextResponse.json({ ok: true });
}
