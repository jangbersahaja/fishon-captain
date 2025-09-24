import { applySecurityHeaders } from "@/lib/headers";
import { snapshotMetrics } from "@/lib/metrics";
import { NextResponse } from "next/server";

// Simple unauthenticated metrics snapshot endpoint (consider protecting or
// restricting in production). Provided mainly for local debugging.
export async function GET() {
  const data = snapshotMetrics();
  return applySecurityHeaders(NextResponse.json({ metrics: data }));
}
