import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const market = process.env.FISHON_MARKET_API_URL;
  const secret = process.env.CAPTAIN_API_SECRET;
  if (!market || !secret) {
    return NextResponse.json(
      { error: "Market API not configured" },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const res = await fetch(`${market}/api/bookings/reject`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-captain-api-secret": secret,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    return NextResponse.json(payload, { status: res.status });
  }

  return NextResponse.json({ ok: true });
}
