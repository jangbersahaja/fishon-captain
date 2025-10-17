import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { counter } from "@/lib/metrics";
import { prisma } from "@/lib/prisma";
import { getRequestId } from "@/lib/requestId";
import { withTiming } from "@/lib/requestTiming";
import { DraftPatchSchema, patchDraft } from "@/server/drafts";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function getUserId(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const id = (user as Record<string, unknown>).id;
  return typeof id === "string" ? id : null;
}

function getUserRole(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user;
  if (!user || typeof user !== "object") return null;
  const role = (user as Record<string, unknown>).role;
  return typeof role === "string" ? role : null;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  const { id: draftId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const userRole = getUserRole(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  const draft = await prisma.charterDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  // Check ownership or admin override
  if (userRole !== "ADMIN" && draft.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  return applySecurityHeaders(NextResponse.json({ draft, requestId }));
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  const { id: draftId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const userRole = getUserRole(session);
  if (!userId || !session)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );

  // Check draft ownership or admin override
  const draft = await prisma.charterDraft.findUnique({
    where: { id: draftId },
    select: { id: true, userId: true },
  });

  if (!draft)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  // Use the draft's owner for operations, but allow admin to edit
  const effectiveUserId = userRole === "ADMIN" ? draft.userId : userId;

  if (userRole !== "ADMIN" && draft.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json", requestId }, { status: 400 })
    );
  const parsed = DraftPatchSchema.safeParse(json);
  if (!parsed.success) {
    counter("draft.patch.invalid_payload").inc();
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "invalid_payload",
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message,
          })),
          requestId,
        },
        { status: 400 }
      )
    );
  }
  const { dataPartial, clientVersion, currentStep } = parsed.data;
  if (typeof clientVersion !== "number") {
    return applySecurityHeaders(
      NextResponse.json(
        {
          error: "invalid_payload",
          issues: [
            { path: ["clientVersion"], message: "clientVersion is required" },
          ],
          requestId,
        },
        { status: 400 }
      )
    );
  }

  // TypeScript now knows clientVersion is a number here
  const validClientVersion: number = clientVersion;

  try {
    const result = await withTiming("patchDraft", () =>
      patchDraft({
        id: draftId,
        userId: session.user.id,
        clientVersion: validClientVersion,
        dataPartial,
        currentStep,
      })
    );
    if (result.conflict) {
      counter("draft.patch.version_conflict").inc();
      return applySecurityHeaders(
        NextResponse.json(
          { error: "version_conflict", server: result.server, requestId },
          { status: 409 }
        )
      );
    }
    counter("draft.patch.success").inc();
    return applySecurityHeaders(
      NextResponse.json({ draft: result.draft, requestId })
    );
  } catch (e) {
    if ((e as Error).message === "not_found")
      return applySecurityHeaders(
        NextResponse.json({ error: "not_found", requestId }, { status: 404 })
      );
    counter("draft.patch.error").inc();
    return applySecurityHeaders(
      NextResponse.json({ error: "patch_failed", requestId }, { status: 500 })
    );
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(req);
  const { id: draftId } = await ctx.params;
  const session = await getServerSession(authOptions);
  const userId = getUserId(session);
  const userRole = getUserRole(session);
  if (!userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "unauthorized", requestId }, { status: 401 })
    );
  const draft = await prisma.charterDraft.findUnique({
    where: { id: draftId },
  });

  if (!draft)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  // Check ownership or admin override
  if (userRole !== "ADMIN" && draft.userId !== userId)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found", requestId }, { status: 404 })
    );

  if (draft.status !== "DRAFT")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_status", requestId }, { status: 400 })
    );
  await prisma.charterDraft.update({
    where: { id: draft.id },
    data: { status: "DELETED" },
  });
  return applySecurityHeaders(NextResponse.json({ ok: true, requestId }));
}
