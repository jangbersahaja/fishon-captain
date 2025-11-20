import { proxyToMarketApiSimple } from "@/lib/api/market-proxy";

export async function POST(req: Request) {
  return proxyToMarketApiSimple(req, "/api/bookings/approve");
}
