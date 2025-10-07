import { prisma } from "@/lib/prisma";
import { Receiver } from "@upstash/qstash";
import { NextRequest, NextResponse } from "next/server";

interface NormalizeCallbackPayload {
  videoId?: string;
  success?: boolean;
  readyUrl?: string;
  error?: string;
  thumbnailUrl?: string;
}

// Secure callback endpoint for normalization completion/failure.
// Expected JSON body: { videoId: string, success: boolean, readyUrl?: string, error?: string, thumbnailUrl?: string }
// Adds QStash signature verification when signing keys are configured.
export async function POST(req: NextRequest) {
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch (e) {
    return NextResponse.json(
      { error: "body_read_failed", message: (e as Error).message },
      { status: 400 }
    );
  }

  // Verify signature if keys present (defensive: skip in dev if not set)
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = req.headers.get("upstash-signature");
  if (signature && currentKey) {
    try {
      const receiver = new Receiver({
        currentSigningKey: currentKey,
        nextSigningKey: nextKey || currentKey,
      });
      const valid = await receiver.verify({ body: rawBody, signature });
      if (!valid) {
        console.warn("[normalize-callback] invalid signature (soft continue)", {
          signature,
        });
      }
    } catch (e) {
      console.warn(
        "[normalize-callback] signature verification error (soft continue)",
        e
      );
    }
  } else if (!signature) {
    console.warn("[normalize-callback] missing signature header", {
      hasCurrentKey: !!currentKey,
    });
  }

  let parsed: NormalizeCallbackPayload = {};
  try {
    parsed = rawBody ? JSON.parse(rawBody) : {};
  } catch (e) {
    return NextResponse.json(
      { error: "invalid_json", message: (e as Error).message },
      { status: 400 }
    );
  }

  const {
    videoId,
    success: successFlag,
    ok,
    readyUrl,
    error,
    thumbnailUrl,
  } = parsed as NormalizeCallbackPayload & { ok?: boolean };
  // Derive success: honor explicit success boolean; fallback to ok if provided.
  const success =
    successFlag === true
      ? true
      : successFlag === false
      ? false
      : ok === true
      ? true
      : ok === false
      ? false
      : undefined;
  if (!videoId) {
    console.warn("[normalize-callback] missing videoId in payload", {
      rawBody,
      parsedKeys: Object.keys(parsed || {}),
    });
    return NextResponse.json({ error: "missing_videoId" }, { status: 400 });
  }

  const video = await prisma.captainVideo.findUnique({
    where: { id: videoId },
  });
  if (!video) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    if (success === true) {
      const updated = await prisma.captainVideo.update({
        where: { id: videoId },
        data: {
          processStatus: "ready",
          ready720pUrl: readyUrl || video.originalUrl,
          thumbnailUrl: thumbnailUrl || video.thumbnailUrl,
          errorMessage: null,
        },
      });
      console.log("[normalize-callback] success", { videoId });
      return NextResponse.json({ ok: true, video: updated });
    } else if (success === false) {
      const updated = await prisma.captainVideo.update({
        where: { id: videoId },
        data: {
          processStatus: "failed",
          errorMessage: error || "normalize_failed",
        },
      });
      console.log("[normalize-callback] failure", { videoId, error });
      return NextResponse.json({ ok: false, video: updated });
    } else {
      return NextResponse.json(
        {
          error: "missing_success_flag",
          message: "success must be true or false",
        },
        { status: 400 }
      );
    }
  } catch (e) {
    console.error("[normalize-callback] db_update_error", e);
    return NextResponse.json(
      { error: "db_update_failed", message: (e as Error).message },
      { status: 500 }
    );
  }
}
