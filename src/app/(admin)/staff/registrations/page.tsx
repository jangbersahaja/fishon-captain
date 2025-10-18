import { AdminBypassLink } from "@/components/admin";
import authOptions from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DraftStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DestructiveActions } from "./_components/DestructiveActions";

const PAGE_SIZE = 25;

// Step labels for display
const STEP_LABELS = [
  "Captain & Charter",
  "Boat & Amenities",
  "Trips & Availability",
  "Description",
  "Media Files",
  "Preview",
];

function getCurrentStepInfo(draft: { currentStep: number }) {
  const step = Math.max(
    0,
    Math.min(draft.currentStep || 0, STEP_LABELS.length - 1)
  );
  return {
    step: step + 1,
    label: STEP_LABELS[step] || "Unknown",
    total: STEP_LABELS.length,
  };
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const stepInfo = getCurrentStepInfo({ currentStep });

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
        {stepInfo.step}
      </div>
      <div className="text-xs text-slate-600">
        <div className="font-medium">{stepInfo.label}</div>
        <div className="text-slate-500">
          Step {stepInfo.step} of {stepInfo.total}
        </div>
      </div>
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
      // Search by user name and email
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
  if (staleOnly) {
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
    where.lastTouchedAt = { lt: cutoff };
  }

  // Default view: only FIRST TIME registrations (no created charter yet and not abandoned/deleted)
  if (!showAll) {
    // Only apply default filters if no specific status is selected
    if (!status) {
      // Show only active drafts and submissions for first-time registrations
      where.charterId = null;
      where.status = { in: ["DRAFT", "SUBMITTED"] };
    } else {
      // If specific status is selected, respect it but still filter to first-time registrations
      // unless it's ABANDONED or DELETED (which might have charters)
      if (status !== "ABANDONED" && status !== "DELETED") {
        where.charterId = null;
      }
    }
  }

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
    <div className="p-6 space-y-6">
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
            placeholder="Search by name, email, draft ID, or user ID"
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

      {/* Mobile-friendly cards layout */}
      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
            No drafts found.
          </div>
        ) : (
          drafts.map((d) => {
            const user = userMap.get(d.userId);
            const staleHours =
              (Date.now() - new Date(d.lastTouchedAt).getTime()) / 36e5;
            const stale = staleHours > 24;
            const verificationStatus = user?.verification?.status || "—";
            const charter = d.charterId ? charterMap.get(d.charterId) : null;
            const noteCount = noteCountMap.get(d.id) || 0;

            return (
              <div
                key={d.id}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                {/* Header row - User info and status */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-slate-800 truncate">
                        {user?.name || "—"}
                      </h3>
                      {noteCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-white">
                          {noteCount}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-600 truncate">
                      {user?.email || "—"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">
                      {d.id}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
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
                    <div className="text-xs text-slate-500">
                      Verification: {verificationStatus}
                    </div>
                  </div>
                </div>

                {/* Progress and details row */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <StepIndicator currentStep={d.currentStep || 0} />
                  <div className="text-right">
                    <div className="text-xs text-slate-500">
                      {new Date(d.lastTouchedAt).toLocaleString()}
                    </div>
                    {stale && (
                      <div className="text-[10px] text-amber-600 font-medium">
                        stale (&gt;24h)
                      </div>
                    )}
                  </div>
                </div>

                {/* Charter link if exists */}
                {charter && (
                  <div className="mb-3 text-sm">
                    <span className="text-slate-500">Charter: </span>
                    <Link
                      href={`/staff/charters/${charter.id}`}
                      className="text-sky-600 hover:underline"
                    >
                      {charter.name || charter.id}
                    </Link>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                  {/* Primary actions - left side */}
                  <div className="flex justify-between w-full">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/staff/registrations/${d.id}`}
                        className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span className="hidden sm:inline text-xs font-medium">
                          View
                        </span>
                      </Link>

                      {user?.email && (
                        <a
                          href={`mailto:${
                            user.email
                          }?subject=${encodeURIComponent(
                            "Continue your Fishon charter registration"
                          )}&body=${encodeURIComponent(
                            "Hi there, we noticed you haven't completed your charter registration. You can resume here: https://www.fishon.my/captain/form"
                          )}`}
                          className="flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                          <span className="hidden sm:inline text-xs font-medium">
                            Email
                          </span>
                        </a>
                      )}
                    </div>
                    {role === "ADMIN" && (
                      <AdminBypassLink
                        href={`/captain/form?adminUserId=${d.userId}`}
                        confirmTitle="Admin Impersonation"
                        confirmDescription={`You are about to open the registration form as:\n\nUser: ${
                          user?.name || "Unknown"
                        } (${user?.email || "No email"})\nDraft ID: ${
                          d.id
                        }\n\nThis will allow you to view and edit their draft. Please enter your admin password to confirm.`}
                        variant="outline"
                        size="sm"
                        className="border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="hidden sm:inline text-xs font-medium">
                          Open Draft
                        </span>
                      </AdminBypassLink>
                    )}
                  </div>

                  {/* Destructive actions - right side */}

                  <DestructiveActions
                    draftId={d.id}
                    status={d.status}
                    userName={user?.name}
                    userEmail={user?.email}
                    markAbandoned={markAbandoned}
                    softDelete={softDelete}
                  />
                </div>
              </div>
            );
          })
        )}
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
