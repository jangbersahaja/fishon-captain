import clsx from "clsx";
import Link from "next/link";

import {
  buildHref,
  SearchParams,
  STALE_THRESHOLD_MINUTES,
  VideoStatus,
  VideoViewModel,
} from "./shared";

const VIDEO_STATUS_LABEL: Record<VideoStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

const VIDEO_STATUS_BADGE_CLASSES: Record<VideoStatus, string> = {
  queued: "bg-slate-100 text-slate-700",
  processing: "bg-amber-100 text-amber-800",
  ready: "bg-emerald-100 text-emerald-800",
  failed: "bg-rose-100 text-rose-800",
};

export default function VideoSection({
  data,
  searchParams,
}: {
  data: VideoViewModel;
  searchParams?: SearchParams;
}) {
  const {
    statusFilter,
    fallbackFilter,
    staleOnly,
    statusCounts,
    fallbackCount,
    staleCount,
    filteredRows,
    fetchLimit,
    fetchedCount,
    displayCount,
  } = data;

  const videoStatuses: VideoStatus[] = [
    "queued",
    "processing",
    "ready",
    "failed",
  ];

  return (
    <div className="space-y-6">
      {/* Status overview cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {videoStatuses.map((status) => (
          <div
            key={status}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{VIDEO_STATUS_LABEL[status]}</span>
              <Link
                href={buildHref("/staff/media", searchParams, {
                  tab: "videos",
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

        {/* Stale videos card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Stale (&gt;{STALE_THRESHOLD_MINUTES}m)</span>
            <Link
              href={buildHref("/staff/media", searchParams, {
                tab: "videos",
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
              : "Includes queued & processing videos"}
          </p>
        </div>
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Fallback Status
        </span>
        {[null, true, false].map((fallback) => (
          <Link
            key={fallback === null ? "all" : String(fallback)}
            href={buildHref("/staff/media", searchParams, {
              tab: "videos",
              fallback: fallbackFilter === fallback ? null : String(fallback),
            })}
            className={clsx(
              "rounded-full border px-3 py-1 text-xs font-medium",
              fallbackFilter === fallback ||
                (fallback === null && fallbackFilter === null)
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {fallback === null ? "All" : fallback ? "Fallback" : "Trimmed"}
          </Link>
        ))}

        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-slate-500">
            Fallback count: {fallbackCount.toLocaleString()}
          </span>
        </div>

        <span className="ml-auto text-xs text-slate-500">
          Showing {displayCount} of {fetchedCount} fetched (limit {fetchLimit})
        </span>
      </div>

      {/* Videos table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Video</th>
              <th className="px-4 py-3 text-left">Owner</th>
              <th className="px-4 py-3 text-left">Processing</th>
              <th className="px-4 py-3 text-left">Timeline</th>
              <th className="px-4 py-3 text-left">Links &amp; Media</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-slate-500"
                >
                  No video records match the current filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const rowClasses = clsx({
                  "bg-amber-50": row.stale && row.processStatus !== "failed",
                  "bg-rose-50": row.processStatus === "failed",
                });
                return (
                  <tr key={row.id} className={rowClasses}>
                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            VIDEO_STATUS_BADGE_CLASSES[row.processStatus]
                          )}
                        >
                          {VIDEO_STATUS_LABEL[row.processStatus]}
                        </span>
                        {row.didFallback ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                            Fallback
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Trimmed
                          </span>
                        )}
                        {row.stale ? (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                            Stale &gt;{STALE_THRESHOLD_MINUTES}m
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-500">
                        <div>
                          <span className="font-medium text-slate-600">
                            Video ID:
                          </span>{" "}
                          {row.id}
                        </div>
                        {row.blobKey ? (
                          <div>
                            <span className="font-medium text-slate-600">
                              Blob Key:
                            </span>{" "}
                            {row.blobKey}
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-700">
                          Trim Start: {row.trimStartSec}s
                        </div>
                        {row.fallbackReason ? (
                          <div className="text-[11px] text-amber-600">
                            Fallback: {row.fallbackReason}
                          </div>
                        ) : null}
                        {row.normalizedBlobKey ? (
                          <div className="break-all text-[11px] text-slate-500">
                            Normalized key: {row.normalizedBlobKey}
                          </div>
                        ) : null}
                        {row.thumbnailBlobKey ? (
                          <div className="break-all text-[11px] text-slate-500">
                            Thumbnail key: {row.thumbnailBlobKey}
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
                          Owner ID: {row.ownerId}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-1">
                        <div>
                          <span className="font-medium text-slate-600">
                            Status:
                          </span>{" "}
                          {VIDEO_STATUS_LABEL[row.processStatus]}
                        </div>
                        {row.errorMessage ? (
                          <div className="rounded-md bg-rose-100 px-2 py-1 text-[11px] text-rose-800">
                            {row.errorMessage}
                          </div>
                        ) : null}
                        {row.ready720pUrl ? (
                          <div className="text-[11px] text-emerald-600">
                            ✓ 720p ready
                          </div>
                        ) : row.processStatus === "ready" ? (
                          <div className="text-[11px] text-amber-600">
                            ⚠ No 720p output
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
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top text-xs text-slate-600">
                      <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-600">
                            Media Links
                          </span>
                          <a
                            href={row.originalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-[11px] text-blue-600 hover:underline"
                          >
                            Original
                          </a>
                          {row.ready720pUrl ? (
                            <a
                              href={row.ready720pUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-[11px] text-blue-600 hover:underline"
                            >
                              720p Ready
                            </a>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              720p not ready
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
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              No thumbnail
                            </span>
                          )}
                        </div>
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
