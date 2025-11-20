import { proxyToMarketApi } from "@/lib/api/market-proxy";

/**
 * POST /api/market/bookings/acknowledge
 *
 * Proxy to fishon-market acknowledge endpoint for AUTO flow bookings
 * Transitions: PAYMENT_AUTHORIZED → PAID
 */
export async function POST(req: Request) {
  return proxyToMarketApi(req, "/api/bookings/acknowledge");
}
