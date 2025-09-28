import clsx from "clsx";
import Link from "next/link";

import {
  buildHref,
  formatBytes,
  formatDuration,
  KIND_LABEL,
  PipelineViewModel,
  SearchParams,
  STALE_THRESHOLD_MINUTES,
  STATUS_BADGE_CLASSES,
  STATUS_LABEL,
  STATUSES,
} from "./shared";

export default function PipelineSection({
  data,
  searchParams,
}: {
  data: PipelineViewModel;
  searchParams?: SearchParams;
}) {
  const {
    statusFilter,
    kindFilter,
    staleOnly,
    statusCounts,
    staleCount,
    filteredRows,
    fetchLimit,
    fetchedCount,
    displayCount,
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((status) => (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{STATUS_LABEL[status]}</span>
              <Link
                href={buildHref("/staff/media", searchParams, {
                  tab: "pipeline",
                  status: statusFilter === status ? null : status,
                })}
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {statusFilter === status ? "Viewing" : "Filter"}
              </Link>
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              {statusCounts[status].toLocaleString()}
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Stale (&gt;{STALE_THRESHOLD_MINUTES}m)</span>
            <Link
              href={buildHref("/staff/media", searchParams, {
                tab: "pipeline",
                stale: staleOnly ? null : "true",
              })}
              className={clsx(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                staleOnly
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {staleOnly ? "Viewing" : "Filter"}
            </Link>
          </div>
          <div className="mt-1 text-2xl font-semibold text-slate-900">
            {staleCount.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {staleOnly
              ? "Showing only stale records"
              : "Includes queued & transcoding uploads"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Kind
        </span>
        {[null, "IMAGE", "VIDEO"].map((kind) => (
          <Link
            key={kind ?? "all"}
            href={buildHref("/staff/media", searchParams, {
              tab: "pipeline",
              kind: kindFilter === kind ? null : kind,
            })}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              kindFilter === kind || (!kind && !kindFilter)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {kind ? KIND_LABEL[kind as keyof typeof KIND_LABEL] : "All"}
          </Link>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          Showing {displayCount} of {fetchedCount} fetched (limit {fetchLimit})
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Media</th>
              <th className="px-4 py-3 text-left">Owner / Charter</th>
              <th className="px-4 py-3 text-left">Timeline</th>
              <th className="px-4 py-3 text-left">Links &amp; Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No media records match the current filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const rowClasses = clsx({
                  "bg-amber-50": row.stale && row.status !== "FAILED",
                  "bg-rose-50": row.status === "FAILED",
                });
                return (
                  <tr key={row.id} className={rowClasses}>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            STATUS_BADGE_CLASSES[row.status]
                          )}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                          {KIND_LABEL[row.kind]}
                        </span>
                        {row.stale ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Stale &gt;{STALE_THRESHOLD_MINUTES}m
                          </span>
                        ) : null}
                        {row.awaitingFinalAsset ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Awaiting final asset
                          </span>
                        ) : null}
                        {row.charterMediaId ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                            Promoted
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                        <div>
                          <span className="font-medium text-slate-600">
                            Pending ID:
                          </span>{" "}
                          {row.id}
                        </div>
                        {row.correlationId ? (
                          <div>
                            <span className="font-medium text-slate-600">
                              Correlation:
                            </span>{" "}
                            {row.correlationId}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700">
                          {row.mimeType ?? ""}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Size: {formatBytes(row.sizeBytes)}
                        </div>
                        {row.kind === "VIDEO" ? (
                          <div className="text-[11px] text-slate-500">
                            Duration: {formatDuration(row.durationSeconds)}
                          </div>
                        ) : null}
                        <div className="break-all text-[11px] text-slate-500">
                          Original key: {row.originalKey}
                        </div>
                        {row.finalKey ? (
                          <div className="break-all text-[11px] text-slate-500">
                            Final key: {row.finalKey}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700">
                          {row.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.email}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          User ID: {row.userId}
                        </div>
                        <div className="mt-1 text-[11px]">
                          <span className="font-medium text-slate-600">
                            Charter:
                          </span>{" "}
                          {row.charterName ? (
                            <span>
                              {row.charterName}
                              {row.charterActive === false ? (
                                <span className="ml-1 text-amber-600">
                                  (inactive)
                                </span>
                              ) : null}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                        {row.charterId ? (
                          <div className="text-[11px] text-slate-500">
                            Charter ID: {row.charterId}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium text-slate-600">
                            Created:
                          </span>{" "}
                          <span title={row.createdAt.toISOString()}>
                            {row.createdAgoLabel}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">
                            Updated:
                          </span>{" "}
                          <span title={row.updatedAt.toISOString()}>
                            {row.updatedAgoLabel}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-slate-600">
                            Consumed:
                          </span>{" "}
                          {row.consumedAt ? (
                            <span title={row.consumedAt.toISOString()}>
                              {row.consumedAgoLabel}
                            </span>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-600">
                            Links
                          </span>
                          <a
                            href={row.originalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-[11px] text-blue-600 hover:underline"
                          >
                            Original
                          </a>
                          {row.finalUrl ? (
                            <a
                              href={row.finalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[11px] text-blue-600 hover:underline"
                            >
                              Final
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Final not available
                            </span>
                          )}
                          {row.thumbnailUrl ? (
                            <a
                              href={row.thumbnailUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[11px] text-blue-600 hover:underline"
                            >
                              Thumbnail
                            </a>
                          ) : null}
                        </div>
                        {row.error ? (
                          <div className="rounded-md bg-rose-100 px-2 py-1 text-[11px] text-rose-800">
                            {row.error}
                          </div>
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
    </div>
  );
}
