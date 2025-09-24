import type { MediaPreview as BasePreview } from "@features/charter-form/types";
import { useState } from "react";

type MediaPreview = BasePreview & {
  alt?: string;
  isCover?: boolean;
  progress?: number;
};

type MediaGridProps = {
  items: MediaPreview[];
  emptyLabel: string;
  onRemove: (index: number) => void;
  onUpdateAlt?: (index: number, alt: string) => void;
  onMove?: (from: number, to: number) => void;
  onRetry?: (index: number) => void;
  kind?: "image" | "video";
};

export function MediaGrid({
  items,
  emptyLabel,
  onRemove,
  onUpdateAlt,
  onMove,
  onRetry,
  kind,
}: MediaGridProps) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 px-4 py-10 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => {
        const disabled =
          typeof item.progress === "number" && item.progress < 100;
        const isVideo =
          kind === "video" || /\.(mp4|mov|webm|ogg)$/iu.test(item.name || "");
        return (
          <div
            key={`${item.url}-${index}`}
            className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm ${
              dragOver === index
                ? "border-slate-400 ring-2 ring-slate-300"
                : "border-neutral-200"
            }`}
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
            {isVideo ? (
              <div className="relative h-36 bg-black/5">
                <video
                  src={item.url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                  playsInline
                  muted
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Video
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="h-36 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.url})` }}
              />
            )}
            {typeof item.progress === "number" &&
              item.progress < 100 &&
              item.progress >= 0 && (
                <div className="absolute inset-0 bg-white/60 flex items-end">
                  <div className="w-full h-1.5 bg-slate-200">
                    <div
                      className="h-1.5 bg-slate-700 transition-all"
                      style={{
                        width: `${Math.max(0, Math.min(100, item.progress))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            {typeof item.progress === "number" && item.progress < 0 && (
              <div className="absolute inset-0 bg-red-50/80 flex items-center justify-center text-xs text-red-700">
                Upload failed
              </div>
            )}
            <div className="px-3 pt-2">
              <input
                type="text"
                placeholder="Alt text (description)"
                value={item.alt ?? ""}
                onChange={(e) => onUpdateAlt?.(index, e.target.value)}
                className="w-full rounded border border-neutral-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300"
                disabled={disabled}
              />
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
              <span className="truncate" title={item.name}>
                {item.name}
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
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  className="text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
