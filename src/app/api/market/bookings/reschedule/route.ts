import { proxyToMarketApi } from "@/lib/api/market-proxy";

export async function POST(req: Request) {
  return proxyToMarketApi(req, "/api/bookings/reschedule");
}
