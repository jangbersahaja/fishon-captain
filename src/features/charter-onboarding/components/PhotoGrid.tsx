import type { MediaPreview as BasePreview } from "@features/charter-onboarding/types";
import { GripVertical } from "lucide-react";
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
      <div className="px-4 py-10 text-sm text-center border border-dashed rounded-2xl border-neutral-200 text-slate-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item, index) => {
          const disabled =
            typeof item.progress === "number" &&
            item.progress >= 0 &&
            item.progress < 100;
          const justCompleted = item.progress === 100;
          return (
            <div
              key={`${item.url}-${index}`}
              className={`group relative overflow-hidden rounded-lg border bg-black shadow-sm ${
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
              <div className="items-center justify-center hidden gap-2 px-3 py-2 text-xs lg:flex text-slate-100">
                <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
                <span className="text-[10px] font-medium text-neutral-400 group-hover/drag:text-blue-400 transition-colors uppercase tracking-wider">
                  Drag to Reorder
                </span>
                <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
              </div>
              {item.isCover && (
                <span className="absolute left-2 top-2 lg:top-11 z-10 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                  Cover
                </span>
              )}
              <div className="flex">
                <div className="relative w-full h-36 lg:h-full aspect-square">
                  <Image
                    src={item.url}
                    fill
                    className="object-cover"
                    sizes="300px"
                    alt={toDisplayName(item.name)}
                  />
                </div>
                <div className="flex items-center justify-center px-3 py-2 text-xs lg:hidden text-slate-100">
                  <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
                  <span className="text-[10px] font-medium text-neutral-400 group-hover/drag:text-blue-400 text-center transition-colors uppercase tracking-wider">
                    Drag to Reorder
                  </span>
                  <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
                </div>
              </div>
              {typeof item.progress === "number" &&
                item.progress < 100 &&
                item.progress >= 0 && (
                  <div className="absolute inset-0 flex items-end bg-white/60">
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-xs text-center text-red-700 bg-red-50/90">
                  <span className="flex items-center gap-1 font-medium">
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

              <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-100">
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
                    className="p-1 transition-colors rounded text-slate-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md p-6 space-y-4 bg-white rounded-2xl">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
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
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Delete Photo?
              </h3>
              <p className="mb-1 text-sm text-gray-600">
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
                className="flex-1 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirm !== null) onRemove(deleteConfirm);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
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
