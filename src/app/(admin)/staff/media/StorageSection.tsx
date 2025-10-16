import clsx from "clsx";
import Link from "next/link";

import StorageManager from "./StorageManager";
import {
  STORAGE_SCOPE_OPTIONS,
  STORAGE_SORT_LABEL,
  SearchParams,
  StorageSortKey,
  StorageViewModel,
  buildHref,
  formatBytes,
} from "./shared";

type StorageSectionProps = {
  data: StorageViewModel;
  searchParams?: SearchParams;
  deleteEndpoint?: string;
};

export default function StorageSection({
  data,
  searchParams,
  deleteEndpoint = "/api/admin/media/delete",
}: StorageSectionProps) {
  const {
    rows,
    total,
    totalSize,
    linkedCount,
    orphanCount,
    filteredCount,
    currentPage,
    totalPages,
    scopeFilter,
    linkFilter,
    searchQuery,
    sortKey,
    sortDir,
    missingReferenced,
    error,
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total blobs</div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {total.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">All blobs in storage</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Total storage</div>
          <div className="mt-1 text-2xl font-semibold text-blue-700">
            {formatBytes(totalSize)}
          </div>
          <p className="mt-1 text-xs text-slate-500">All blobs combined</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Linked to DB</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">
            {linkedCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {((linkedCount / total) * 100).toFixed(1)}% of total
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Orphan blobs</div>
          <div className="mt-1 text-2xl font-semibold text-amber-600">
            {orphanCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {((orphanCount / total) * 100).toFixed(1)}% of total
          </p>
        </div>
      </div>

      {missingReferenced.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <p className="font-medium">Referenced in DB but missing from blob:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {missingReferenced.slice(0, 10).map((item) => (
              <li key={item.key} className="break-all">
                {item.key} —{" "}
                {item.references.map((ref) => ref.label).join(", ")}
              </li>
            ))}
          </ul>
          {missingReferenced.length > 10 ? (
            <p className="mt-2 italic">
              + {missingReferenced.length - 10} more missing references
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="font-medium uppercase tracking-wide text-slate-500">
          Scope
        </span>
        {STORAGE_SCOPE_OPTIONS.map((option) => (
          <Link
            key={option.label}
            href={buildHref("/staff/media", searchParams, {
              tab: "storage",
              scope: option.value ? option.value : null,
            })}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              scopeFilter === option.value || (!option.value && !scopeFilter)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {option.label}
          </Link>
        ))}
        <span className="ml-4 font-medium uppercase tracking-wide text-slate-500">
          Link state
        </span>
        {[
          { value: null, label: "All" },
          { value: "linked", label: "Linked" },
          { value: "orphan", label: "Orphan" },
        ].map((option) => (
          <Link
            key={option.label}
            href={buildHref("/staff/media", searchParams, {
              tab: "storage",
              linked: option.value ? option.value : null,
            })}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              linkFilter === option.value || (!option.value && !linkFilter)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {option.label}
          </Link>
        ))}
        <span className="ml-4 font-medium uppercase tracking-wide text-slate-500">
          Sort
        </span>
        {(["uploadedAt", "size", "key"] as StorageSortKey[]).map((key) => {
          const nextDir =
            sortKey === key && sortDir === "desc" ? "asc" : "desc";
          return (
            <Link
              key={key}
              href={buildHref("/staff/media", searchParams, {
                tab: "storage",
                sort: key,
                dir: sortKey === key ? nextDir : sortDir,
              })}
              className={clsx(
                "rounded-full border px-3 py-1 text-xs font-medium",
                sortKey === key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
              title={
                sortKey === key
                  ? `Sorting ${STORAGE_SORT_LABEL[key]} (${sortDir})`
                  : `Sort by ${STORAGE_SORT_LABEL[key]}`
              }
            >
              {STORAGE_SORT_LABEL[key]}
              {sortKey === key ? ` (${sortDir})` : ""}
            </Link>
          );
        })}
      </div>

      <form
        className="flex flex-wrap items-center gap-2 text-sm"
        action="/staff/media"
        method="get"
      >
        <input type="hidden" name="tab" value="storage" />
        {scopeFilter ? (
          <input type="hidden" name="scope" value={scopeFilter} />
        ) : null}
        {linkFilter ? (
          <input type="hidden" name="linked" value={linkFilter} />
        ) : null}
        {sortKey ? <input type="hidden" name="sort" value={sortKey} /> : null}
        {sortDir ? <input type="hidden" name="dir" value={sortDir} /> : null}
        <input
          type="text"
          name="q"
          defaultValue={searchQuery}
          placeholder="Search key or reference"
          className="w-full max-w-xs rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Search
        </button>
        {searchQuery ? (
          <Link
            href={buildHref("/staff/media", searchParams, {
              tab: "storage",
              q: null,
            })}
            className="text-xs text-slate-500 hover:underline"
          >
            Clear
          </Link>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">
          Showing {rows.length} on this page
        </span>
      </form>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-sm text-slate-600">
            {filteredCount.toLocaleString()} results • Page {currentPage} of{" "}
            {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Link
                href={buildHref("/staff/media", searchParams, {
                  tab: "storage",
                  cursor: (currentPage - 1).toString(),
                })}
                className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ← Previous
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400">
                ← Previous
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={buildHref("/staff/media", searchParams, {
                  tab: "storage",
                  cursor: (currentPage + 1).toString(),
                })}
                className="inline-flex items-center gap-1 rounded-full border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Next →
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400">
                Next →
              </span>
            )}
          </div>
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <StorageManager rows={rows} deleteEndpoint={deleteEndpoint} />
      )}
    </div>
  );
}
