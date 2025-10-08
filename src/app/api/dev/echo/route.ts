import { NextRequest, NextResponse } from "next/server";

// Diagnostic echo endpoint: logs headers and raw body for callback debugging.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const headers: Record<string, string> = {};
  for (const [k, v] of req.headers.entries()) {
    if (k.startsWith("x-") || k.startsWith("upstash") || k === "content-type") {
      headers[k] = v;
    }
  }
  console.log("[echo] callback received", { headers, raw });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: "POST raw body to echo" });
}
