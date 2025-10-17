import type { MediaPreview as BasePreview } from "@features/charter-onboarding/types";
import Image from "next/image";
import { useState } from "react";

// Photo-only preview type
export type PhotoPreview = BasePreview & {
  alt?: string;
  isCover?: boolean;
  progress?: number; // upload progress only (images upload instantly in new flow but keep for compatibility)
};

interface PhotoGridProps {
  items: PhotoPreview[];
  emptyLabel: string;
  onRemove: (index: number) => void;
  onUpdateAlt?: (index: number, alt: string) => void;
  onMove?: (from: number, to: number) => void;
  onRetry?: (index: number) => void; // retained for API shape, rarely used now
}

export function PhotoGrid({
  items,
  emptyLabel,
  onRemove,
  onMove,
  onRetry,
}: PhotoGridProps) {
  const toDisplayName = (name?: string) => {
    if (!name) return "";
    try {
      const base = name.split("?")[0];
      const parts = base.split("/");
      const last = parts[parts.length - 1];
      return last || name;
    } catch {
      return name;
    }
  };
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const disabled =
            typeof item.progress === "number" &&
            item.progress >= 0 &&
            item.progress < 100;
          const justCompleted = item.progress === 100;
          return (
            <div
              key={`${item.url}-${index}`}
              className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm ${
                dragOver === index
                  ? "border-slate-400 ring-2 ring-slate-300"
                  : "border-neutral-200"
              } ${justCompleted ? "animate-[fadeOut_0.25s_ease-in]" : ""}`}
              draggable={Boolean(onMove) && !disabled}
              onDragStart={(e) => {
                if (disabled || !onMove) return;
                setDragFrom(index);
                setDragOver(index);
                try {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                } catch {}
              }}
              onDragEnter={() => {
                if (disabled || dragFrom === null) return;
                setDragOver(index);
              }}
              onDragOver={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (dragFrom === null) return;
                e.preventDefault();
                const from = dragFrom;
                const to = index;
                setDragFrom(null);
                setDragOver(null);
                if (from !== to) onMove?.(from, to);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
            >
              {item.isCover && (
                <span className="absolute left-2 top-2 z-10 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                  Cover
                </span>
              )}
              <div className="h-36 relative">
                <Image
                  src={item.url}
                  fill
                  className="object-cover"
                  sizes="300px"
                  alt={toDisplayName(item.name)}
                />
              </div>
              {typeof item.progress === "number" &&
                item.progress < 100 &&
                item.progress >= 0 && (
                  <div className="absolute inset-0 bg-white/60 flex items-end">
                    <div className="w-full h-1.5 bg-slate-200">
                      <div
                        className="h-1.5 bg-slate-700 transition-all"
                        style={{
                          width: `${Math.max(
                            0,
                            Math.min(100, item.progress)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              {typeof item.progress === "number" && item.progress < 0 && (
                <div className="absolute inset-0 bg-red-50/90 flex flex-col items-center justify-center gap-2 text-xs text-red-700 p-3 text-center">
                  <span className="font-medium flex items-center gap-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 5v6.25a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0Zm-1.5 9.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z" />
                    </svg>
                    Upload failed
                  </span>
                  <span className="text-[10px] text-red-500/70">
                    Check connection & retry
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
                <span className="truncate" title={item.name}>
                  {toDisplayName(item.name)}
                </span>
                <div className="flex items-center gap-2">
                  {typeof item.progress === "number" && item.progress < 0 && (
                    <button
                      type="button"
                      onClick={() => onRetry?.(index)}
                      className="text-amber-600 hover:underline"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(index)}
                    disabled={disabled}
                    aria-label="Remove photo"
                    title="Remove photo"
                    className="text-slate-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6v12c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V6" />
                      <path d="M10 10v6" />
                      <path d="M14 10v6" />
                      <path d="M9 6V4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Delete Confirmation Dialog */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Photo?
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                This will permanently delete the photo and cannot be undone.
              </p>
              <p className="text-xs text-gray-500">
                File:{" "}
                <span className="font-medium">
                  {toDisplayName(items[deleteConfirm]?.name)}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm !== null) onRemove(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
