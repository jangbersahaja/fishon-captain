// app/api/jobs/transcode/route.ts
import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

export const runtime = "edge"; // tiny and fast; just queues the job

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    key?: string;
    url?: string;
    charterId?: string;
  } | null;
  if (!body?.key) {
    return NextResponse.json({ error: "Missing blob key" }, { status: 400 });
  }
  // Validate and ensure workerUrl has a valid scheme
  const workerUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/workers/transcode`
    : null;

  if (
    !workerUrl ||
    (!workerUrl.startsWith("http://") && !workerUrl.startsWith("https://"))
  ) {
    throw new Error(
      "Invalid NEXT_PUBLIC_SITE_URL: Ensure it includes http:// or https://"
    );
  }

  await qstash.publishJSON({
    url: workerUrl,
    body, // { key, url, charterId? }
  });

  return NextResponse.json({ ok: true });
}
