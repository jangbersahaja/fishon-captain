import { getEffectiveUserId } from "@/lib/adminBypass";
import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { counter } from "@/lib/metrics";
import { rateLimit } from "@/lib/rateLimiter";
import { getRequestId } from "@/lib/requestId";
import { withTiming } from "@/lib/requestTiming";
import { createDraft, getActiveDraft } from "@/server/drafts";
import { createDefaultCharterFormValues } from "@features/charter-onboarding/charterForm.defaults";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

export async function GET(req: Request) {
  const requestId = getRequestId(req);
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // Use centralized bypass logic
  const url = new URL(req.url);
  const adminUserIdRaw = url.searchParams.get("adminUserId");
  const adminUserId = adminUserIdRaw ?? undefined;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (!effectiveUserId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );
  const existing = await withTiming("drafts_getActive", () =>
    getActiveDraft(effectiveUserId as string)
  );
  if (!existing)
    return applySecurityHeaders(NextResponse.json({ draft: null, requestId }));
  counter("draft.get.hit").inc();
  return applySecurityHeaders(
    NextResponse.json({ draft: existing, requestId })
  );
}

export async function POST(req: Request) {
  const requestId = getRequestId(req);
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // Use centralized bypass logic
  const url = new URL(req.url);
  const adminUserIdRaw = url.searchParams.get("adminUserId");
  const adminUserId = adminUserIdRaw ?? undefined;
  const effectiveUserId = getEffectiveUserId({
    session,
    query: { adminUserId },
  });
  if (typeof effectiveUserId !== "string")
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // If admin bypass, require password
  if (adminUserId) {
    let password: string | undefined;
    try {
      const body = await req.json();
      password = body?.adminBypassPassword;
    } catch {}
    const { verifyAdminBypassPassword } = await import("@/lib/adminBypass");
    const valid = await verifyAdminBypassPassword(password || "");
    if (!valid) {
      return applySecurityHeaders(
        NextResponse.json(
          { error: "invalid_admin_password", requestId },
          { status: 403 }
        )
      );
    }
  }

  // Light rate limit: at most 3 new draft creation attempts per minute per user
  const rl = await rateLimit({
    key: `draftCreate:${effectiveUserId as string}`,
    windowMs: 60_000,
    max: 3,
  });
  if (!rl.allowed) {
    counter("draft.create.rate_limited").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "rate_limited", requestId }, { status: 429 })
    );
  }
  const existing = await withTiming("drafts_getActive", () =>
    getActiveDraft(effectiveUserId as string)
  );
  if (existing)
    return applySecurityHeaders(
      NextResponse.json({ draft: existing, requestId })
    );
  const initial = createDefaultCharterFormValues();
  const draft = await withTiming("drafts_create", () =>
    createDraft({ userId: effectiveUserId as string, initial, step: 0 })
  );
  counter("draft.create.success").inc();
  return applySecurityHeaders(NextResponse.json({ draft, requestId }));
}
