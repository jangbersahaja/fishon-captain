import { proxyToMarketApiSimple } from "@/lib/api/market-proxy";

/**
 * Captain Cancel Booking Proxy
 *
 * Proxies captain cancellation requests to fishon-market.
 * Used when captain wants to cancel a CONFIRMED (PAID) booking.
 *
 * Per policy:
 * - Captain must provide a reason
 * - Angler receives FULL refund (100%)
 * - Captain bears all refund costs
 */
export async function POST(req: Request) {
  return proxyToMarketApiSimple(req, "/api/bookings/captain-cancel");
}
