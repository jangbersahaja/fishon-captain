import authOptions from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev_only" }, { status: 403 });
  }

  const info = {
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
      VERCEL_URL: process.env.VERCEL_URL || null,
      QSTASH_TOKEN: process.env.QSTASH_TOKEN ? "set" : null,
      QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY
        ? "set"
        : null,
      EXTERNAL_WORKER_URL: process.env.EXTERNAL_WORKER_URL || null,
      BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "set" : null,
      BLOB_HOSTNAME: process.env.BLOB_HOSTNAME || null,
    },
    logs: {
      lastConsoleLog: "Check server console for recent logs",
    },
    endpoints: {
      transcode: "/api/jobs/transcode",
      worker: "/api/workers/transcode",
      simpleWorker: "/api/workers/transcode-simple",
      pending: "/api/media/pending",
      uploadDeprecated: "/api/media/upload", // deprecated
      photo: "/api/media/photo",
      video: "/api/media/video",
    },
  };

  return NextResponse.json(info);
}

// POST endpoint to manually trigger operations
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "dev_only" }, { status: 403 });
  }

  const body = await req.json();

  console.log("🔧 DEBUG API Called:", {
    action: body.action,
    data: body.data,
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message: "Debug log written to console",
    received: body,
  });
}
