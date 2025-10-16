"use client";

import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

type Reference = {
  type: string;
  label: string;
  href?: string;
};

type StorageRow = {
  key: string;
  url: string;
  size: number;
  sizeLabel: string;
  uploadedAtIso: string;
  uploadedAgo: string;
  contentType: string | null;
  scope: string;
  scopeLabel: string;
  linked: boolean;
  references: Reference[];
  // Video-specific metadata
  linkedVideoId?: string;
  videoStatus?: string;
  originalVideoKey?: string | null;
  thumbnailKey?: string | null;
  normalizedKey?: string | null;
  isOriginalVideo?: boolean;
  isThumbnail?: boolean;
  isNormalizedVideo?: boolean;
  // Owner info for captain-videos
  ownerName?: string;
  ownerAvatar?: string | null;
  ownerId?: string;
};

type StorageManagerProps = {
  rows: StorageRow[];
  deleteEndpoint: string;
};

type Feedback = { type: "success" | "error"; text: string } | null;

type DeleteResponse = {
  ok: boolean;
  deleted: number;
  failures: Array<{ key: string; error: string }>;
};

export default function StorageManager({
  rows,
  deleteEndpoint,
}: StorageManagerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isPending, startTransition] = useTransition();
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const allSelected = rows.length > 0 && selected.length === rows.length;
  const someSelected = selected.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    // Clear selection if filter changes reduce available rows
    setSelected((prev) =>
      prev.filter((key) => rows.some((r) => r.key === key))
    );
  }, [rows]);

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelected(rows.map((row) => row.key));
      } else {
        setSelected([]);
      }
    },
    [rows]
  );

  const toggleKey = useCallback((key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleDelete = useCallback(() => {
    if (selected.length === 0 || isPending) return;
    const confirmed = window.confirm(
      `Delete ${selected.length} file${selected.length === 1 ? "" : "s"}?`
    );
    if (!confirmed) return;
    startTransition(async () => {
      setFeedback(null);
      try {
        const res = await fetch(deleteEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: selected }),
        });
        if (!res.ok) {
          const errorText = await res.text();
          setFeedback({
            type: "error",
            text: errorText || "Failed to delete media",
          });
          return;
        }
        const data = (await res.json()) as DeleteResponse;
        if (!data.ok) {
          const failureSummary = data.failures
            .map((f) => f.key)
            .slice(0, 5)
            .join(", ");
          setFeedback({
            type: "error",
            text:
              data.failures.length > 0
                ? `Some deletions failed: ${failureSummary}`
                : "Deletion failed",
          });
          return;
        }
        const failureSummary =
          data.failures.length > 0 ? ` (${data.failures.length} failed)` : "";
        setFeedback({
          type: "success",
          text: `Deleted ${data.deleted} file${
            data.deleted === 1 ? "" : "s"
          }${failureSummary}.`,
        });
        setSelected([]);
        router.refresh();
      } catch (error) {
        setFeedback({
          type: "error",
          text: error instanceof Error ? error.message : "Delete failed",
        });
      }
    });
  }, [deleteEndpoint, isPending, router, selected, startTransition]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No media files match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={selected.length === 0 || isPending}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              selected.length === 0 || isPending
                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                : "bg-rose-600 text-white hover:bg-rose-500"
            )}
          >
            Delete selected
            {selected.length > 0 ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {selected.length}
              </span>
            ) : null}
          </button>
          <div className="text-xs text-slate-500">
            {selected.length} selected / {rows.length} visible
          </div>
        </div>
        {feedback ? (
          <div
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-medium",
              feedback.type === "success"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-700"
            )}
          >
            {feedback.text}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={isPending}
                  aria-label="Select all"
                />
              </th>
              <th className="px-4 py-3 text-left">Blob key</th>
              <th className="px-4 py-3 text-left">Details</th>
              <th className="px-4 py-3 text-left">Links</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isChecked = selectedSet.has(row.key);
              return (
                <tr key={row.key} className="align-top">
                  <td className="px-4 py-3 align-top">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                      checked={isChecked}
                      onChange={() => toggleKey(row.key)}
                      disabled={isPending}
                      aria-label={`Select ${row.key}`}
                    />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div className="flex flex-col gap-1">
                      <span className="break-all font-mono text-[11px] text-slate-700">
                        {row.key}
                      </span>

                      {/* Owner info for videos */}
                      {row.ownerName && (
                        <div className="flex items-center gap-2 rounded border border-blue-100 bg-blue-50 px-2 py-1">
                          {row.ownerAvatar ? (
                            <Image
                              src={row.ownerAvatar}
                              alt={row.ownerName}
                              width={20}
                              height={20}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-200 text-[9px] font-bold text-blue-800">
                              {row.ownerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-[10px] font-medium text-blue-900">
                            {row.ownerName}
                          </span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium uppercase tracking-wide text-slate-600"
                          title={`Scope: ${row.scope}`}
                        >
                          {row.scopeLabel}
                        </span>
                        <span
                          className={clsx(
                            "inline-flex items-center rounded-full px-2 py-0.5 font-medium uppercase tracking-wide",
                            row.linked
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {row.linked ? "Linked" : "Orphan"}
                        </span>
                        {row.isOriginalVideo && (
                          <span
                            className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 font-medium uppercase tracking-wide text-blue-700"
                            title="Original video file"
                          >
                            Original
                          </span>
                        )}
                        {row.isThumbnail && (
                          <span
                            className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 font-medium uppercase tracking-wide text-purple-700"
                            title="Video thumbnail"
                          >
                            Thumb
                          </span>
                        )}
                        {row.isNormalizedVideo && (
                          <span
                            className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 font-medium uppercase tracking-wide text-emerald-700"
                            title="Normalized 720p video"
                          >
                            720p
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500">
                        Size: {row.sizeLabel}
                      </div>
                      {row.contentType ? (
                        <div className="text-[11px] text-slate-500">
                          MIME: {row.contentType}
                        </div>
                      ) : null}
                      <div className="text-[11px] text-slate-500">
                        Uploaded:{" "}
                        <span title={row.uploadedAtIso}>{row.uploadedAgo}</span>
                      </div>

                      {/* Video pipeline relationships */}
                      {row.linkedVideoId && (
                        <div className="mt-2 space-y-1 rounded border border-blue-200 bg-blue-50 p-2">
                          <div className="text-[11px] font-medium text-blue-900">
                            Video Pipeline
                          </div>
                          <div className="text-[10px] text-blue-700">
                            ID: {row.linkedVideoId}
                          </div>
                          {row.videoStatus && (
                            <div className="text-[10px] text-blue-700">
                              Status:{" "}
                              <span className="font-medium uppercase">
                                {row.videoStatus}
                              </span>
                            </div>
                          )}
                          <div className="mt-1 space-y-0.5 text-[10px]">
                            {row.isOriginalVideo && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white">
                                  O
                                </span>
                                <span className="text-blue-800">
                                  Original video
                                </span>
                              </div>
                            )}
                            {row.isThumbnail && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[8px] font-bold text-white">
                                  T
                                </span>
                                <span className="text-blue-800">Thumbnail</span>
                                {row.originalVideoKey && (
                                  <span className="text-slate-500">
                                    → {row.originalVideoKey.slice(-20)}
                                  </span>
                                )}
                              </div>
                            )}
                            {row.isNormalizedVideo && (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white">
                                  N
                                </span>
                                <span className="text-blue-800">
                                  Normalized 720p
                                </span>
                              </div>
                            )}
                          </div>
                          {row.originalVideoKey &&
                            !row.isOriginalVideo &&
                            (row.isThumbnail || row.isNormalizedVideo) && (
                              <div className="mt-1 text-[10px] text-slate-600">
                                Original:{" "}
                                <span className="break-all font-mono">
                                  {row.originalVideoKey}
                                </span>
                              </div>
                            )}
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500">
                        References:
                      </div>
                      <ul className="ml-3 list-disc space-y-1 text-[11px] text-slate-500">
                        {row.references.length === 0 ? (
                          <li className="text-amber-700">No references</li>
                        ) : (
                          row.references.map((ref, idx) => (
                            <li key={`${row.key}-ref-${idx}`}>
                              {ref.href ? (
                                <a
                                  href={ref.href}
                                  className="text-blue-600 hover:underline"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {ref.label}
                                </a>
                              ) : (
                                <span>{ref.label}</span>
                              )}
                              <span className="text-slate-400">
                                {" "}
                                ({ref.type})
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-slate-600">
                    <div className="flex flex-col gap-2">
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          const clipboard = navigator.clipboard;
                          if (
                            !clipboard ||
                            typeof clipboard.writeText !== "function"
                          ) {
                            setFeedback({
                              type: "error",
                              text: "Clipboard unavailable",
                            });
                            return;
                          }
                          clipboard
                            .writeText(row.url)
                            .then(() =>
                              setFeedback({
                                type: "success",
                                text: "URL copied to clipboard",
                              })
                            )
                            .catch(() => {
                              setFeedback({
                                type: "error",
                                text: "Copy failed",
                              });
                            });
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        Copy URL
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
