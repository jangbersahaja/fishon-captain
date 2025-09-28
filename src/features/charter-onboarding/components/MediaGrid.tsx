import type { MediaPreview as BasePreview } from "@features/charter-onboarding/types";
import Image from "next/image";
import { useState } from "react";

type MediaPreview = BasePreview & {
  alt?: string;
  isCover?: boolean;
  progress?: number;
  thumbnailUrl?: string; // For video thumbnails
  processing?: boolean;
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
  const deriveStatus = (item: MediaPreview) => {
    // Infer from upstream flags. A FAILED video may carry a custom flag we treat as truthy.
    // Allow for an injected boolean 'failed' prop without widening MediaPreview permanently.
    const maybeFailed = (item as unknown as { failed?: boolean }).failed;
    if (maybeFailed) return "failed" as const;
    if (item.processing) return "processing" as const;
    return "ready" as const;
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
        const isProcessing = Boolean(item.processing);
        const disabled =
          isProcessing ||
          (typeof item.progress === "number" &&
            item.progress >= 0 &&
            item.progress < 100);
        const justCompleted = item.progress === 100; // used during HOLD_MS before list migration
        const isVideo =
          kind === "video" || /\.(mp4|mov|webm|ogg)$/iu.test(item.name || "");
        const status = deriveStatus(item);
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
            {status === "processing" && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                Processing
              </span>
            )}
            {status === "failed" && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                Failed
              </span>
            )}
            {isVideo ? (
              <div className="relative h-36 bg-black/5">
                {status === "processing" ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-600 animate-pulse">
                    <div className="relative h-full w-full">
                      {item.thumbnailUrl && !videoErrors.has(index) && (
                        <Image
                          src={item.thumbnailUrl}
                          fill
                          className="object-cover opacity-40 blur-sm"
                          sizes="300px"
                          alt={`${toDisplayName(
                            item.name
                          )} thumbnail (processing)`}
                          unoptimized
                          onError={() =>
                            setVideoErrors((prev) => new Set(prev).add(index))
                          }
                        />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                        <span
                          className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
                          aria-hidden="true"
                        />
                        <p className="text-xs font-semibold uppercase tracking-wide">
                          Processing…
                        </p>
                        <p className="mt-1 px-4 text-center text-[11px] text-slate-500">
                          Optimizing video & thumbnail
                        </p>
                      </div>
                    </div>
                  </div>
                ) : status === "failed" ? (
                  <div
                    className="h-full w-full flex flex-col items-center justify-center bg-red-50 text-red-600 cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => window.open(item.url, "_blank")}
                    title="Open original video"
                  >
                    <div className="text-2xl mb-1">⚠️</div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide">
                      Transcode failed
                    </div>
                    <div className="text-[10px] mt-1 text-red-500/70 px-3 text-center">
                      Retry upload or contact support
                    </div>
                  </div>
                ) : item.thumbnailUrl && !videoErrors.has(index) ? (
                  // Use thumbnail for video preview - video is ready
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
                    {/* Ready indicator */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                        ✓ Ready
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="h-full w-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs"
                    onClick={() => window.open(item.url, "_blank")}
                    title="Open video"
                  >
                    <div className="text-lg mb-1">�️</div>
                    <span>No thumbnail yet</span>
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
