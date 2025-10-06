import authOptions from "@/lib/auth";
import { counter } from "@/lib/metrics";
import { writeAuditLog } from "@/server/audit";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/videos/analytics
// Body: { fileName, sizeBytes, durationSec, startSec, trimmed:boolean, didFallback?:boolean, uploadMs:number }
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    const {
      fileName,
      sizeBytes,
      durationSec,
      startSec,
      trimmed,
      didFallback,
      uploadMs,
    } = json as Record<string, unknown>;

    if (typeof fileName !== "string" || !fileName) {
      return NextResponse.json({ error: "invalid_fileName" }, { status: 400 });
    }
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    // Best effort audit log (non-blocking semantics handled inside writeAuditLog)
    const wasFallback = !!didFallback;
    counter("short_video_upload_total").inc();
    if (wasFallback) {
      counter("short_video_upload_fallback").inc();
    } else {
      counter("short_video_upload_non_fallback").inc();
    }

    await writeAuditLog({
      actorUserId: userId,
      entityType: "media",
      entityId: fileName.slice(0, 180), // keep bounded length
      action: "short_video_upload",
      after: {
        fileName,
        sizeBytes,
        durationSec,
        startSec,
        trimmed: !!trimmed,
        didFallback: wasFallback,
        uploadMs: typeof uploadMs === "number" ? uploadMs : null,
        ts: Date.now(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "analytics_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
