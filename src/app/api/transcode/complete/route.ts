import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  // Deprecated endpoint: unified on /api/workers/transcode + /transcode-simple pipeline
  return NextResponse.json(
    {
      error: "deprecated_endpoint",
      message:
        "Use queued worker pipeline (/api/jobs/transcode -> /api/workers/transcode) instead of direct completion.",
    },
    { status: 410 }
  );
}
