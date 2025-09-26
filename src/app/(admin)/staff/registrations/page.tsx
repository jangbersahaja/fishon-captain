import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DraftStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

const PAGE_SIZE = 25;

// Define the first four real steps (exclude preview)
const STEP_FIELD_GROUPS: { id: string; label: string; fields: string[] }[] = [
  {
    id: "basics",
    label: "Captain & Charter",
    fields: [
      "operator.displayName",
      "operator.experienceYears",
      "operator.bio",
      "operator.phone",
      "operator.avatar",
      "charterType",
      "charterName",
      "state",
      "city",
      "startingPoint",
      "postcode",
      "latitude",
      "longitude",
    ],
  },
  {
    id: "experience",
    label: "Boat & Logistic",
    fields: [
      "boat.name",
      "boat.type",
      "boat.lengthFeet",
      "boat.capacity",
      "boat.features",
      "amenities",
      "policies",
      "pickup",
    ],
  },
  { id: "trips", label: "Trips & Availability", fields: ["trips"] },
  {
    id: "media",
    label: "Media & Pricing",
    fields: ["photos", "videos", "description", "tone"],
  },
];

function getByPath<T = unknown>(obj: unknown, path: string): T | undefined {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc == null ? undefined : (acc as Record<string, unknown>)[key],
      obj
    ) as T | undefined;
}

function isFilledValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return true; // treat 0 as provided
  if (typeof v === "boolean") return true;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object")
    return Object.keys(v as Record<string, unknown>).length > 0; // simple heuristic
  return false;
}
interface StepStat {
  id: string;
  label: string;
  filled: number;
  total: number;
  pct: number;
}

function computeStepStats(draftData: unknown): StepStat[] {
  return STEP_FIELD_GROUPS.map((g) => {
    const total = g.fields.length;
    let filled = 0;
    for (const f of g.fields) {
      if (isFilledValue(getByPath(draftData, f))) filled++;
    }
    return {
      id: g.id,
      label: g.label,
      filled,
      total,
      pct: total === 0 ? 0 : Math.round((filled / total) * 100),
    };
  });
}

function StepRings({ stats }: { stats: ReturnType<typeof computeStepStats> }) {
  return (
    <div className="flex gap-2">
      {stats.map((s, idx) => {
        const pct = s.pct;
        const angle = Math.round((pct / 100) * 360);
        return (
          <div
            key={s.id}
            className="relative w-10 h-10"
            title={`${s.label}: ${s.filled}/${s.total} (${pct}%)`}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-semibold text-slate-700 border border-slate-200"
              style={{
                background: `conic-gradient(#0ea5e9 ${angle}deg, #e2e8f0 0deg)` /* sky-500, slate-200 */,
              }}
            >
              {idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function markAbandoned(id: string) {
  "use server";
  await prisma.charterDraft.update({
    where: { id },
    data: { status: "ABANDONED" },
  });
}
async function softDelete(id: string) {
  "use server";
  await prisma.charterDraft.update({
    where: { id },
    data: { status: "DELETED" },
  });
}

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
  const showAll = (params.all as string | undefined) === "1";

  const where: Prisma.CharterDraftWhereInput = {};
  if (
    status &&
    ["DRAFT", "SUBMITTED", "ABANDONED", "DELETED"].includes(status)
  ) {
    where.status = status as DraftStatus;
  }
  if (q) {
    where.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { userId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (staleOnly) {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    where.lastTouchedAt = { lt: cutoff };
  }

  // Default view: only FIRST TIME registrations (no created charter yet and not abandoned/deleted)
  if (!showAll) {
    // Compose with AND to avoid use of any
    const base: Prisma.CharterDraftWhereInput = {
      charterId: null,
      NOT: [{ status: "ABANDONED" }, { status: "DELETED" }],
    };
    if (!where.status) {
      base.status = { in: ["DRAFT", "SUBMITTED"] };
    }
    Object.assign(where, base);
  }

  const [total, drafts] = await Promise.all([
    prisma.charterDraft.count({ where }),
    prisma.charterDraft.findMany({
      where,
      orderBy: { lastTouchedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

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

  // Fetch users & verification in bulk
  const userIds = drafts.map((d) => d.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      name: true,
      verification: { select: { status: true } },
    },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

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

  const buildQuery = (patch: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const baseStatus = patch.status === undefined ? status : patch.status;
    const baseAll =
      patch.all === undefined ? (showAll ? "1" : undefined) : patch.all;
    const baseQ = patch.q === undefined ? q : String(patch.q);
    const baseStale =
      patch.stale === undefined ? (staleOnly ? "1" : undefined) : patch.stale;
    const basePage = patch.page === undefined ? page : Number(patch.page);
    if (baseQ) sp.set("q", baseQ);
    if (baseStatus) sp.set("status", String(baseStatus));
    if (baseStale) sp.set("stale", String(baseStale));
    if (baseAll) sp.set("all", String(baseAll));
    if (basePage && basePage !== 1) sp.set("page", String(basePage));
    return `?${sp.toString()}`;
  };

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Registrations</h1>
        <div className="text-sm text-slate-500">
          Monitor in-progress captain & charter registrations
        </div>
      </div>

      {/* (Removed quick filter chips per request) */}

      {/* Filters */}
      <form
        action="/staff/registrations"
        method="get"
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm"
      >
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">Search</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Draft id or user id"
            className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-slate-500">Status</label>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">All</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="ABANDONED">ABANDONED</option>
            <option value="DELETED">DELETED</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            name="stale"
            value="1"
            defaultChecked={staleOnly}
            id="staleOnly"
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <label
            htmlFor="staleOnly"
            className="text-xs font-medium text-slate-600"
          >
            Stale (&gt;24h)
          </label>
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input
            type="checkbox"
            name="all"
            value="1"
            defaultChecked={showAll}
            id="allToggle"
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <label
            htmlFor="allToggle"
            className="text-xs font-medium text-slate-600"
          >
            Show all drafts
          </label>
        </div>
        <button
          type="submit"
          className="ml-auto rounded-full border border-slate-300 bg-slate-50 px-4 py-1.5 text-sm text-slate-700 hover:bg-white"
        >
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="text-xs text-slate-500 bg-slate-50/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">User</th>
              <th className="px-3 py-2 text-left font-medium">Email</th>
              <th className="px-3 py-2 text-left font-medium">Draft ID</th>
              <th className="px-3 py-2 text-left font-medium">Notes</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Verification</th>
              <th className="px-3 py-2 text-left font-medium">Steps</th>
              <th className="px-3 py-2 text-left font-medium">
                Linked Charter
              </th>
              <th className="px-3 py-2 text-left font-medium">Last touched</th>
              <th className="px-3 py-2 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {drafts.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-6 text-center text-slate-600"
                >
                  No drafts found.
                </td>
              </tr>
            ) : (
              drafts.map((d) => {
                const user = userMap.get(d.userId);
                const stepStats = computeStepStats(d.data);
                const staleHours =
                  (Date.now() - new Date(d.lastTouchedAt).getTime()) / 36e5;
                const stale = staleHours > 24;
                const verificationStatus = user?.verification?.status || "—";
                const charter = d.charterId
                  ? charterMap.get(d.charterId)
                  : null;
                return (
                  <tr
                    key={d.id}
                    className="border-t border-slate-100 hover:bg-slate-50/50 align-middle"
                  >
                    <td className="px-3 py-2 text-slate-700 min-w-[140px]">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {user?.name || "—"}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {user?.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {user?.email || "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-700 font-mono text-[11px]">
                      {d.id}
                    </td>
                    <td className="px-3 py-2">
                      {(() => {
                        const c = noteCountMap.get(d.id) || 0;
                        return c > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-white">
                            {c}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          d.status === "SUBMITTED"
                            ? "inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                            : d.status === "ABANDONED"
                            ? "inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                            : d.status === "DELETED"
                            ? "inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800"
                            : "inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700"
                        }
                      >
                        {d.status}
                        {!showAll && d.charterId && (
                          <span className="ml-1 text-[10px] text-slate-500">
                            (edit)
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-700 text-xs">
                      {verificationStatus}
                    </td>
                    <td className="px-3 py-2">
                      <StepRings stats={stepStats} />
                      <div className="mt-1 text-[11px] text-slate-500">
                        {stale ? "stale (>24h)" : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {charter ? (
                        <Link
                          href={`/staff/charters/${charter.id}`}
                          className="text-sky-600 hover:underline"
                        >
                          {charter.name || charter.id}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {new Date(d.lastTouchedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/staff/registrations/${d.id}`}
                          className="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-white bg-slate-50 text-slate-700"
                        >
                          View
                        </Link>
                        {user?.email
                          ? (() => {
                              const body = encodeURIComponent(
                                "Hi there, we noticed you haven't completed your charter registration. You can resume here: https://www.fishon.my/captain/form"
                              );
                              const subject = encodeURIComponent(
                                "Continue your Fishon charter registration"
                              );
                              return (
                                <a
                                  href={`mailto:${user.email}?subject=${subject}&body=${body}`}
                                  className="rounded-full border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-white"
                                >
                                  Email
                                </a>
                              );
                            })()
                          : null}
                        {d.status === "DRAFT" ? (
                          <form action={markAbandoned.bind(null, d.id)}>
                            <button
                              className="rounded-full border border-amber-300 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-50"
                              type="submit"
                            >
                              Mark Abandoned
                            </button>
                          </form>
                        ) : null}
                        {d.status !== "DELETED" ? (
                          <form action={softDelete.bind(null, d.id)}>
                            <button
                              className="rounded-full border border-rose-300 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-50"
                              type="submit"
                            >
                              Delete
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={buildQuery({ page: p })}
              className={
                p === page
                  ? "rounded-md bg-slate-800 px-3 py-1.5 text-white text-xs font-medium"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
              }
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
