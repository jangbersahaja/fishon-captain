import Image from "next/image";
import { useState } from "react";

export interface VideoItem {
  name: string; // storageKey or pending placeholder id
  url: string; // preview or final url
  thumbnailUrl?: string;
  durationSeconds?: number;
  status: "queued" | "transcoding" | "ready" | "failed";
  pendingId?: string;
  error?: string;
}

interface VideoGridProps {
  items: VideoItem[];
  emptyLabel: string;
  onRemove: (index: number) => void;
  onRetry: (index: number) => void;
  onOpen?: (item: VideoItem) => void;
}

export function VideoGrid({
  items,
  emptyLabel,
  onRemove,
  onRetry,
  onOpen,
}: VideoGridProps) {
  const [thumbErrors, setThumbErrors] = useState<Set<number>>(new Set());
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
        const status = item.status;
        const showThumb =
          item.thumbnailUrl && !thumbErrors.has(index) && status === "ready";
        const isProcessing = status === "queued" || status === "transcoding";
        const isFailed = status === "failed";
        const durationLabel = item.durationSeconds
          ? formatDuration(item.durationSeconds)
          : null;
        return (
          <div
            key={`${item.name}-${index}`}
            className="group relative overflow-hidden rounded-2xl border bg-white shadow-sm border-neutral-200"
          >
            {/* Status badges */}
            {isProcessing && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                {status === "queued" ? "Uploading" : "Processing"}
              </span>
            )}
            {isFailed && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-red-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                Failed
              </span>
            )}
            {status === "ready" && !isFailed && (
              <span className="absolute right-2 top-2 z-10 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow">
                Ready
              </span>
            )}

            {/* Content container */}
            <div
              className={`relative h-36 w-full cursor-pointer ${
                isProcessing ? "bg-slate-100" : "bg-black/5"
              }`}
              onClick={() => onOpen?.(item)}
              title={status === "ready" ? "Open video" : undefined}
            >
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                  <div className="relative mb-3 h-8 w-8">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-slate-300 to-slate-200" />
                    <div className="absolute inset-0 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin [animation-duration:1.1s]" />
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    {status === "queued" ? "Uploading" : "Processing"}
                  </p>
                  <p className="mt-1 px-4 text-center text-[11px] text-slate-500">
                    Preparing preview…
                  </p>
                </div>
              )}
              {isFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-600 px-2 text-center">
                  <div className="text-2xl mb-1">⚠️</div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide">
                    Transcode failed
                  </div>
                  <div className="text-[10px] mt-1 text-red-500/70">
                    Retry or remove
                  </div>
                </div>
              )}
              {showThumb && (
                <Image
                  src={item.thumbnailUrl!}
                  fill
                  className="object-cover"
                  sizes="300px"
                  alt={`${item.name} thumbnail`}
                  unoptimized
                  onError={() =>
                    setThumbErrors((prev) => new Set(prev).add(index))
                  }
                />
              )}
              {status === "ready" && !showThumb && !isFailed && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 text-slate-600 text-xs">
                  <div className="mb-1 text-lg">�</div>
                  <span>Video ready</span>
                  <span className="mt-0.5 text-[10px] text-slate-400">
                    (thumbnail pending)
                  </span>
                </div>
              )}
              {/* Play overlay */}
              {status === "ready" && showThumb && (
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
              )}
              {durationLabel && status === "ready" && (
                <div className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {durationLabel}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-600">
              <span className="truncate" title={item.name}>
                {displayName(item.name)}
              </span>
              <div className="flex items-center gap-2">
                {isFailed && (
                  <button
                    type="button"
                    onClick={() => onRetry(index)}
                    className="text-amber-600 hover:underline"
                  >
                    Retry
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:underline"
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

function displayName(name: string) {
  try {
    const base = name.split("?")[0];
    const parts = base.split("/");
    return parts[parts.length - 1] || name;
  } catch {
    return name;
  }
}
function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds | 0}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
