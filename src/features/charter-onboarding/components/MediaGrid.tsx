import type { MediaPreview as BasePreview } from "@features/charter-onboarding/types";
import Image from "next/image";
import { useState } from "react";

type MediaPreview = BasePreview & {
  alt?: string;
  isCover?: boolean;
  progress?: number;
  thumbnailUrl?: string; // For video thumbnails
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
  // Derive a display-friendly filename from a storage key or URL
  const toDisplayName = (name?: string) => {
    if (!name) return "";
    try {
      // Remove query string if present, then take the last path segment
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
  const [videoErrors, setVideoErrors] = useState<Set<number>>(new Set());
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
          typeof item.progress === "number" &&
          item.progress >= 0 &&
          item.progress < 100;
        const justCompleted = item.progress === 100; // used during HOLD_MS before list migration
        const isVideo =
          kind === "video" || /\.(mp4|mov|webm|ogg)$/iu.test(item.name || "");
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
            {isVideo ? (
              <div className="relative h-36 bg-black/5">
                {item.thumbnailUrl && !videoErrors.has(index) ? (
                  // Use thumbnail for video preview
                  <div
                    className="relative h-full w-full cursor-pointer group"
                    onClick={() => window.open(item.url, "_blank")}
                    title="Click to play video"
                  >
                    <Image
                      src={item.thumbnailUrl}
                      fill
                      className="object-cover"
                      sizes="300px"
                      alt={`${toDisplayName(item.name)} thumbnail`}
                      unoptimized={true} // Disable Next.js optimization for thumbnails
                      onError={() =>
                        setVideoErrors((prev) => new Set(prev).add(index))
                      }
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="bg-white/90 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-gray-800 ml-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : videoErrors.has(index) ? (
                  // Generic fallback for videos that can't load
                  <div
                    className="h-full w-full flex flex-col items-center justify-center bg-gray-100 text-gray-500 cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => window.open(item.url, "_blank")}
                    title="Click to open video in new tab"
                  >
                    <div className="text-2xl mb-2">🎥</div>
                    <div className="text-xs text-center px-2">
                      Video Preview
                    </div>
                    <div className="text-xs text-center px-2 mt-1 text-gray-400">
                      (Click to view)
                    </div>
                  </div>
                ) : (
                  // Try to load video element for preview
                  <div className="relative h-full w-full">
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      preload="metadata"
                      playsInline
                      muted
                      onError={() => {
                        setVideoErrors((prev) => new Set(prev).add(index));
                      }}
                    />
                    {/* Video label for video element fallback */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Video
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-36 relative">
                <Image
                  src={item.url}
                  fill
                  className="object-cover"
                  sizes="300px"
                  alt={toDisplayName(item.name)}
                />
              </div>
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
