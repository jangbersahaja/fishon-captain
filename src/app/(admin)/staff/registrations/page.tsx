import authOptions from "@/lib/auth";

import { prisma } from "@/lib/prisma";
import { DraftStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";

import { redirect } from "next/navigation";

const PAGE_SIZE = 25;

// Step labels for display

// Staff view of in-progress captain/charter registrations (drafts)
export default async function StaffRegistrationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user) redirect("/auth?mode=signin&next=/staff/registrations");
  if (role !== "STAFF" && role !== "ADMIN") redirect("/captain");
  const params = (await searchParams) || {};
  const page = Math.max(1, parseInt(String(params.page || "1"), 10) || 1);
  const q = (params.q as string | undefined)?.trim() || "";
  const status = (params.status as string | undefined) || ""; // DRAFT/SUBMITTED/ABANDONED/DELETED
  const staleOnly = (params.stale as string | undefined) === "1";

  const where: Prisma.CharterDraftWhereInput = {};
  // Search filter
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { userId: { contains: q, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }
  // Status filter
  if (
    status &&
    ["DRAFT", "SUBMITTED", "ABANDONED", "DELETED"].includes(status)
  ) {
    where.status = status as DraftStatus;
  }
  // Stale filter (if ever re-enabled)
  if (staleOnly) {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    where.lastTouchedAt = { lt: cutoff };
  }
  // If no status selected ("All"), show all drafts (no restrictive charterId/status filter)

  const [total, drafts] = await Promise.all([
    prisma.charterDraft.count({ where }),
    prisma.charterDraft.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            verification: { select: { status: true } },
          },
        },
      },
      orderBy: { lastTouchedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  type UserData = NonNullable<(typeof drafts)[0]["user"]>;

  // Note counts with safe fallback
  let noteCountMap = new Map<string, number>();
  if (drafts.length) {
    const draftIds = drafts.map((d) => d.id);
    try {
      const noteCountsRaw = await prisma.draftNote.groupBy({
        by: ["draftId"],
        where: { draftId: { in: draftIds } },
        _count: { _all: true },
      });
      noteCountMap = new Map(
        noteCountsRaw.map((n) => [n.draftId, n._count._all])
      );
    } catch {
      try {
        // Raw SQL fallback (Postgres specific)
        const placeholders = draftIds.map((_, i) => `$${i + 1}`).join(",");
        const rows = await prisma.$queryRawUnsafe<
          { draftId: string; count: number }[]
        >(
          `SELECT "draftId", COUNT(*)::int as count FROM "DraftNote" WHERE "draftId" IN (${placeholders}) GROUP BY "draftId"`,
          ...draftIds
        );
        noteCountMap = new Map(rows.map((r) => [r.draftId, r.count]));
      } catch {
        // leave empty
      }
    }
  }

  // Create user map from included data
  const userMap = new Map<string, UserData>(
    drafts
      .filter((d) => d.user !== null)
      .map((d) => [d.userId, d.user as UserData])
  );

  // Fetch linked charters names
  const charterIds = drafts.map((d) => d.charterId).filter(Boolean) as string[];
  const charters = charterIds.length
    ? await prisma.charter.findMany({
        where: { id: { in: charterIds } },
        select: { id: true, name: true },
      })
    : [];
  const charterMap = new Map(charters.map((c) => [c.id, c]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Normalize drafts and userMap for client (convert Date to string, verification.status to string)
  const normalizedDrafts = drafts.map((d) => ({
    ...d,
    createdAt:
      d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    lastTouchedAt:
      d.lastTouchedAt instanceof Date
        ? d.lastTouchedAt.toISOString()
        : d.lastTouchedAt,
    user: d.user
      ? {
          ...d.user,
          displayName: d.user.name ?? undefined,
          verification: d.user.verification
            ? { status: String(d.user.verification.status) }
            : undefined,
        }
      : undefined,
  }));
  const normalizedUserMap = new Map(
    Array.from(userMap.entries()).map(([k, v]) => [
      k,
      {
        ...v,
        displayName: v.name ?? undefined,
        verification: v.verification
          ? { status: String(v.verification.status) }
          : undefined,
      },
    ])
  );
  const RegistrationsPageClientWrapper = (
    await import("./RegistrationsPageClientWrapper")
  ).default;
  return (
    <RegistrationsPageClientWrapper
      drafts={normalizedDrafts}
      userMap={normalizedUserMap}
      charterMap={charterMap}
      noteCountMap={noteCountMap}
      role={role}
      q={q}
      status={status}
      page={page}
      totalPages={totalPages}
    />
  );
}
