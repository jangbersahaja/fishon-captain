"use client";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface VideoRecord {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processStatus: string; // queued | processing | ready | failed
  createdAt: string;
  errorMessage?: string | null;
  ready720pUrl?: string | null;
  // didFallback & fallbackReason intentionally not surfaced in UI anymore
  didFallback?: boolean;
  fallbackReason?: string | null;
}
interface VideoManagerProps {
  ownerId: string;
  onVideosChange?: (videos: VideoRecord[]) => void;
  onPendingChange?: (pending: boolean) => void;
  refreshToken?: number; // increment to force reload
}

export const VideoManager: React.FC<VideoManagerProps> = ({
  ownerId,
  onVideosChange,
  onPendingChange,
  refreshToken,
}) => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [localThumbs, setLocalThumbs] = useState<Record<string, string>>({});
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const prevPendingRef = useRef<boolean | null>(null);
  const prevVideosRef = useRef<VideoRecord[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/videos/list?ownerId=${ownerId}`);
    if (res.ok) {
      const data = await res.json();
      const incoming: VideoRecord[] = data.videos || [];
      setVideos((prev) => {
        if (prev.length === incoming.length) {
          let same = true;
          for (let i = 0; i < prev.length; i++) {
            const a = prev[i];
            const b = incoming[i];
            if (
              a.id !== b.id ||
              a.processStatus !== b.processStatus ||
              a.originalUrl !== b.originalUrl ||
              a.thumbnailUrl !== b.thumbnailUrl
            ) {
              same = false;
              break;
            }
          }
          if (same) return prev; // skip unnecessary state update to avoid parent effect loops
        }
        return incoming;
      });
    }
    setLoading(false);
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  // Poll while any non-ready and notify parent of changes
  useEffect(() => {
    const hasPending = videos.some((v) => v.processStatus !== "ready");

    // Only notify parent if the pending state has actually changed
    if (prevPendingRef.current !== hasPending) {
      prevPendingRef.current = hasPending;
      onPendingChange?.(hasPending);
    }

    // Only notify parent if the videos array has actually changed
    const videosChanged =
      videos.length !== prevVideosRef.current.length ||
      videos.some((v, i) => {
        const prev = prevVideosRef.current[i];
        return (
          !prev || v.id !== prev.id || v.processStatus !== prev.processStatus
        );
      });

    if (videosChanged) {
      prevVideosRef.current = videos;
      onVideosChange?.(videos);
    }

    // Set up polling only if there are pending videos
    if (!hasPending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, load]);

  const remove = async (id: string) => {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    load();
  };

  const retry = async (id: string) => {
    setRetrying((r) => ({ ...r, [id]: true }));
    try {
      await fetch(`/api/videos/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: id }),
      });
      // immediate refresh; queue route may transition queued->processing fast
      setTimeout(load, 500);
    } finally {
      setTimeout(() => setRetrying((r) => ({ ...r, [id]: false })), 600);
    }
  };

  // Attempt client-side frame capture for ready videos lacking thumbnailUrl
  useEffect(() => {
    const targets = videos.filter(
      (v) =>
        v.processStatus === "ready" && !v.thumbnailUrl && !localThumbs[v.id]
    );
    if (!targets.length) return;
    let cancelled = false;
    targets.forEach((v) => {
      const videoEl = document.createElement("video");
      videoEl.crossOrigin = "anonymous"; // attempt CORS-safe capture
      videoEl.preload = "metadata";
      videoEl.src = v.ready720pUrl || v.originalUrl;
      const timeout = setTimeout(() => {
        videoEl.remove();
      }, 8000);
      videoEl.addEventListener("error", () => {
        clearTimeout(timeout);
        videoEl.remove();
      });
      videoEl.addEventListener("loadeddata", () => {
        try {
          videoEl.currentTime = Math.min(0.15, (videoEl.duration || 1) - 0.05);
        } catch {
          /* no-op */
        }
      });
      videoEl.addEventListener("seeked", () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = videoEl.videoWidth || 320;
          canvas.height = videoEl.videoHeight || 180;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          if (!cancelled && dataUrl.startsWith("data:image")) {
            setLocalThumbs((lt) => ({ ...lt, [v.id]: dataUrl }));
          }
        } catch {
          /* ignore */
        } finally {
          clearTimeout(timeout);
          videoEl.remove();
        }
      });
    });
    return () => {
      cancelled = true;
    };
  }, [videos, localThumbs]);

  const statusPill = (v: VideoRecord) => {
    const base = "px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide";
    switch (v.processStatus) {
      case "ready":
        return (
          <span className={`${base} bg-green-600/90 text-white`}>READY</span>
        );
      case "processing":
        return (
          <span className={`${base} bg-amber-500/90 text-white animate-pulse`}>
            PROCESSING
          </span>
        );
      case "queued":
        return (
          <span className={`${base} bg-gray-400/80 text-white`}>QUEUED</span>
        );
      case "failed":
        return (
          <span className={`${base} bg-red-600/90 text-white`}>FAILED</span>
        );
      default:
        return (
          <span className={`${base} bg-gray-500 text-white`}>
            {v.processStatus}
          </span>
        );
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Your Short Videos</h3>
      {loading && <div className="text-sm text-gray-500">Loading...</div>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {videos.map((v) => (
          <div
            key={v.id}
            className="border rounded p-2 space-y-1 bg-white/40 backdrop-blur"
          >
            <div className="aspect-video bg-gray-100 flex items-center justify-center text-xs text-gray-600 relative overflow-hidden rounded-sm group">
              {v.thumbnailUrl || localThumbs[v.id] ? (
                <>
                  <Image
                    src={localThumbs[v.id] || (v.thumbnailUrl as string)}
                    alt="thumb"
                    fill
                    sizes="(max-width:768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {v.processStatus !== "ready" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] text-white font-semibold">
                      {v.processStatus}
                    </div>
                  )}
                </>
              ) : v.processStatus === "ready" ? (
                <span className="text-gray-500">No thumb</span>
              ) : (
                <span className="animate-pulse">{v.processStatus}</span>
              )}
            </div>
            <div className="flex justify-between items-start gap-2">
              {statusPill(v)}
              <div className="flex gap-1">
                {v.processStatus === "failed" && (
                  <button
                    type="button"
                    onClick={() => retry(v.id)}
                    disabled={retrying[v.id]}
                    className="text-[10px] px-2 py-0.5 rounded bg-amber-600 text-white disabled:opacity-50"
                  >
                    {retrying[v.id] ? "…" : "Retry"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(v.id)}
                  className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  Del
                </button>
              </div>
            </div>
            {v.errorMessage && v.processStatus === "failed" && (
              <div className="text-[10px] text-red-600 line-clamp-2">
                {v.errorMessage}
              </div>
            )}
          </div>
        ))}
        {videos.length === 0 && !loading && (
          <div className="col-span-full text-sm text-gray-500">
            No videos yet.
          </div>
        )}
      </div>
    </div>
  );
};
