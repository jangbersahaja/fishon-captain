import authOptions from "@/lib/auth";
import { applySecurityHeaders } from "@/lib/headers";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function getUser(session: unknown): { id: string; role?: string } | null {
  if (!session || typeof session !== "object") return null;
  const user = (session as Record<string, unknown>).user as
    | { id?: string; role?: string }
    | undefined;
  if (!user?.id) return null;
  return { id: user.id, role: user.role };
}

type DocData = {
  key: string;
  url: string;
  name: string;
  updatedAt?: string;
  status?: "processing" | "validated" | "rejected";
  validForPeriod?: { from?: string; to?: string };
};
type Doc = DocData | null;

// Shared parser to safely coerce unknown JSON to a Doc shape or null
const toDoc = (v: unknown): Doc => {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const key = typeof r.key === "string" ? r.key : undefined;
  const url = typeof r.url === "string" ? r.url : undefined;
  const name = typeof r.name === "string" ? r.name : undefined;
  const updatedAt = typeof r.updatedAt === "string" ? r.updatedAt : undefined;
  const s = r.status;
  const status: DocData["status"] | undefined =
    s === "processing" || s === "validated" || s === "rejected"
      ? (s as DocData["status"])
      : undefined;
  const vfp =
    r.validForPeriod && typeof r.validForPeriod === "object"
      ? (r.validForPeriod as Record<string, unknown>)
      : undefined;
  const validForPeriod = vfp
    ? {
        from: typeof vfp.from === "string" ? vfp.from : undefined,
        to: typeof vfp.to === "string" ? vfp.to : undefined,
      }
    : undefined;
  if (!key || !url || !name) return null;
  return { key, url, name, updatedAt, status, validForPeriod };
};

const fields = [
  "idFront",
  "idBack",
  "captainLicense",
  "boatRegistration",
  "fishingLicense",
] as const;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const user = getUser(session);
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "forbidden" }, { status: 403 })
    );
  }

  const url = new URL(req.url);
  const showAll = url.searchParams.get("all") === "1";

  const rows = await prisma.captainVerification.findMany({
    include: {
      user: {
        include: {
          captainProfile: {
            include: { charters: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const items = rows
    .map((r) => {
      const docs = Object.fromEntries(
        fields.map((f) => [
          f,
          toDoc((r as unknown as Record<string, unknown>)[f]),
        ])
      ) as Record<(typeof fields)[number], Doc>;
      const processingFields = fields.filter(
        (f) => docs[f]?.status === "processing"
      );
      const validatedFields = fields.filter(
        (f) => docs[f]?.status === "validated"
      );
      const uploadedFields = fields.filter((f) => !!docs[f]);
      const additionalRaw = (r as unknown as Record<string, unknown>)
        .additional;
      const hasAdditional = Array.isArray(additionalRaw)
        ? (additionalRaw as unknown[]).length > 0
        : false;
      const hasAny = uploadedFields.length > 0 || hasAdditional;
      // Derive a charter name: prefer the most recently updated charter
      const cps = r.user?.captainProfile;
      const cs = cps?.charters || [];
      const sorted = [...cs].sort((a, b) =>
        a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0
      );
      const charterName = sorted[0]?.name;
      return {
        userId: r.userId,
        user: {
          name: r.user?.name,
          email: r.user?.email,
        },
        updatedAt: r.updatedAt.toISOString(),
        processing: processingFields,
        validated: validatedFields,
        uploaded: uploadedFields,
        hasAny,
        charterName,
      };
    })
    .filter((x) => (showAll ? x.hasAny : x.processing.length > 0))
    .map((x) => ({
      userId: x.userId,
      user: x.user,
      updatedAt: x.updatedAt,
      processing: x.processing,
      validated: x.validated,
      uploaded: x.uploaded,
      charterName: x.charterName,
    }));

  return applySecurityHeaders(NextResponse.json({ items }));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const user = getUser(session);
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    return applySecurityHeaders(
      NextResponse.json({ error: "forbidden" }, { status: 403 })
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return applySecurityHeaders(
      NextResponse.json({ error: "invalid_json" }, { status: 400 })
    );

  type ApproveBody = {
    userId: string;
    approve: (typeof fields)[number][];
    validTo?: string; // ISO date
    validForever?: boolean;
  };
  const b = body as Partial<ApproveBody>;
  // Also support rejection
  type RejectBody = {
    userId: string;
    reject: (typeof fields)[number][];
    reason?: string;
  };
  const rj = body as Partial<RejectBody>;

  if (
    !b.userId ||
    ((!Array.isArray(b.approve) || b.approve.length === 0) &&
      (!Array.isArray(rj.reject) || rj.reject.length === 0))
  ) {
    return applySecurityHeaders(
      NextResponse.json({ error: "missing_fields" }, { status: 400 })
    );
  }

  const targetUserId = b.userId || rj.userId!;
  const row = await prisma.captainVerification.findUnique({
    where: { userId: targetUserId },
  });
  if (!row)
    return applySecurityHeaders(
      NextResponse.json({ error: "not_found" }, { status: 404 })
    );

  const now = new Date().toISOString();
  const validForPeriod = b.validForever
    ? { from: now }
    : b.validTo
    ? { from: now, to: b.validTo }
    : undefined;

  // Build update payload mutating selected fields
  const update: Record<string, unknown> = {};
  if (Array.isArray(b.approve) && b.approve.length) {
    for (const f of b.approve as (typeof fields)[number][]) {
      const curr = toDoc((row as unknown as Record<string, unknown>)[f]);
      if (!curr) continue;
      update[f] = {
        ...curr,
        status: "validated",
        validForPeriod: validForPeriod ?? curr?.validForPeriod,
        updatedAt: now,
      };
    }
  }

  if (Array.isArray(rj.reject) && rj.reject.length) {
    for (const f of rj.reject as (typeof fields)[number][]) {
      const curr = toDoc((row as unknown as Record<string, unknown>)[f]);
      if (!curr) continue;
      update[f] = {
        ...curr,
        status: "rejected",
        rejectionReason: rj.reason,
        updatedAt: now,
      };
    }
  }

  if (Object.keys(update).length === 0) {
    return applySecurityHeaders(NextResponse.json({ ok: true }));
  }

  await prisma.captainVerification.update({
    where: { userId: targetUserId },
    data: update,
  });

  return applySecurityHeaders(NextResponse.json({ ok: true }));
}
