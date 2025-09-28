import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 300;

interface SessionUserShape {
  user?: { id?: string };
}
function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as SessionUserShape).user;
  return user && typeof user.id === "string" ? user.id : null;
}

// POST /api/media/video
// Accepts video file + charterId, creates PendingMedia record (QUEUED) and queues transcode job.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const charterId =
      typeof form.get("charterId") === "string"
        ? (form.get("charterId") as string)
        : null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }
    // charterId no longer strictly required: allow pre-charter video uploads in create flow.
    // Orphan (charterId=null) PendingMedia will be attached on finalize submission.
    // NOTE: Ensure finalize logic later links any READY pending videos with null charterId for this user.
    const mime = file.type || "application/octet-stream";
    if (!/video\//.test(mime)) {
      return NextResponse.json({ error: "not_video" }, { status: 400 });
    }

    const originalName = file.name || "video";
    const sanitized = originalName.replace(/[^\w\d.-]/g, "_").slice(0, 160);
    const idPart = crypto.randomUUID();
    const originalKey = `captains/${userId}/media/original/${idPart}-${sanitized}`;

    const blobRes = await put(originalKey, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      contentType: mime,
    });

    // Create PendingMedia (video path only)
    const pending = await prisma.pendingMedia.create({
      data: {
        userId,
        charterId: charterId || undefined,
        kind: "VIDEO",
        originalKey,
        originalUrl: blobRes.url,
        status: "QUEUED",
        sizeBytes: file.size,
        mimeType: mime,
        correlationId: crypto.randomUUID(),
      },
      select: { id: true, status: true, originalUrl: true },
    });

    // Queue transcode job (reusing existing job route -> worker fallback)
    let queued = false;
    let directFallback = false;
    let queueError: string | null = null;
    // Capture synchronous transcode result (when worker ran inline)
    let inlineFinal: null | {
      finalUrl?: string | null;
      finalKey?: string | null;
      thumbnailUrl?: string | null;
      status?: string | null;
    } = null;
    const reqOrigin = (() => {
      try {
        return new URL(req.url).origin;
      } catch {
        return null;
      }
    })();
    const base =
      reqOrigin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const normalizedBase = base.replace(/\/$/, "");
    const jobUrl = `${normalizedBase}/api/jobs/transcode`;
    try {
      console.log("[video-upload] queue_attempt", {
        jobUrl,
        pendingMediaId: pending.id,
      });
      const resp = await fetch(jobUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingMediaId: pending.id,
          originalKey,
          originalUrl: blobRes.url,
          filename: sanitized,
          charterId,
          userId,
        }),
      });
      let queueResponseBody: unknown = null;
      try {
        queueResponseBody = await resp.json();
      } catch {
        queueResponseBody = null;
      }
      let explicitBodyFail = false;
      if (
        typeof queueResponseBody === "object" &&
        queueResponseBody !== null &&
        "ok" in queueResponseBody
      ) {
        explicitBodyFail = (queueResponseBody as { ok?: unknown }).ok === false;
      }
      if (!resp.ok || explicitBodyFail) {
        queueError =
          queueError ||
          (!resp.ok
            ? `jobs_route_status_${resp.status}`
            : "jobs_route_body_not_ok");
        console.warn("[video-upload] queue_route_non_ok", {
          status: resp.status,
          pendingMediaId: pending.id,
          body: queueResponseBody,
        });
      } else {
        queued = true;
        console.log("[video-upload] queue_route_response", queueResponseBody);
        // If the jobs route executed a direct simple worker (local dev path), body may contain final fields
        interface PossiblyDirectBody {
          direct?: boolean;
          body?: unknown;
        }
        const qBody: PossiblyDirectBody =
          typeof queueResponseBody === "object" && queueResponseBody
            ? (queueResponseBody as PossiblyDirectBody)
            : {};
        if (qBody.direct === true && typeof qBody.body === "string") {
          try {
            interface ParsedInline {
              ok?: boolean;
              finalUrl?: string;
              finalKey?: string | null;
              thumbnailUrl?: string | null;
            }
            const parsedRaw = JSON.parse(qBody.body) as unknown;
            const parsed: ParsedInline | null =
              parsedRaw && typeof parsedRaw === "object"
                ? (parsedRaw as ParsedInline)
                : null;
            if (parsed?.ok && parsed.finalUrl) {
              inlineFinal = {
                finalUrl: parsed.finalUrl,
                finalKey: parsed.finalKey || null,
                thumbnailUrl: parsed.thumbnailUrl || null,
                status: "READY",
              };
            }
          } catch {
            /* ignore parse */
          }
        }
      }
    } catch (e) {
      queueError = e instanceof Error ? e.message : String(e);
      console.error("[video-upload] queue_route_exception", {
        error: queueError,
        pendingMediaId: pending.id,
      });
    }

    // Strong fallback: call simple worker directly if not queued
    if (!queued) {
      const simpleUrl = `${normalizedBase}/api/workers/transcode-simple`;
      try {
        console.log("[video-upload] direct_simple_worker_fallback", {
          simpleUrl,
          pendingMediaId: pending.id,
        });
        const workerResp = await fetch(simpleUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pendingMediaId: pending.id,
            originalKey,
            originalUrl: blobRes.url,
            filename: sanitized,
            charterId,
            userId,
          }),
        });
        directFallback = true;
        console.log("[video-upload] simple_worker_result", {
          status: workerResp.status,
          ok: workerResp.ok,
          pendingMediaId: pending.id,
        });
        try {
          const body = await workerResp.json();
          if (body && body.ok && body.finalUrl) {
            inlineFinal = {
              finalUrl: body.finalUrl,
              finalKey: body.finalKey || null,
              thumbnailUrl: body.thumbnailUrl || null,
              status: "READY",
            };
          }
        } catch {
          /* ignore parse for fallback */
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        console.error("[video-upload] simple_worker_failed", {
          error: errMsg,
          pendingMediaId: pending.id,
        });
        if (!queueError) queueError = errMsg;
      }
    }

    // If we have inlineFinal (READY) but pending.status is still QUEUED, attempt a fast lookup to sync.
    let mergedStatus = pending.status;
    if (inlineFinal && inlineFinal.status === "READY") {
      mergedStatus = "READY";
    }

    return NextResponse.json({
      ok: true,
      pendingMediaId: pending.id,
      status: mergedStatus,
      previewUrl: pending.originalUrl,
      transcodeQueued: queued,
      directFallback,
      queueError,
      finalUrl: inlineFinal?.finalUrl || null,
      finalKey: inlineFinal?.finalKey || null,
      thumbnailUrl: inlineFinal?.thumbnailUrl || null,
    });
  } catch (e) {
    console.error("video upload error", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
