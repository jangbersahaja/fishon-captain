// app/api/jobs/transcode/route.ts
import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

export const runtime = "edge"; // tiny and fast; just queues the job

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    originalKey?: string;
    originalUrl?: string;
    charterId?: string;
    filename?: string;
    // Legacy support
    key?: string;
    url?: string;
  } | null;

  if (!body?.originalKey && !body?.key) {
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

  // Normalize the payload for the worker
  const payload = {
    originalKey: body.originalKey || body.key,
    originalUrl: body.originalUrl || body.url,
    charterId: body.charterId,
    filename: body.filename,
  };

  await qstash.publishJSON({
    url: workerUrl,
    body: payload,
  });

  return NextResponse.json({ ok: true });
}
