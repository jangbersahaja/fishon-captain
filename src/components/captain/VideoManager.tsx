"use client";
import { Trash2Icon } from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";

// Relative time utility (lightweight, no Intl.RelativeTimeFormat reliance for older browsers)
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return diffSec + "s ago";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin + "m ago";
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + "h ago";
  const diffDay = Math.floor(diffHr / 24);
  return diffDay + "d ago";
}

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
  const [deleteConfirm, setDeleteConfirm] = useState<{
    video: VideoRecord;
    show: boolean;
  } | null>(null);
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
    setDeleteConfirm(null);
    load();
  };

  const handleDeleteClick = (video: VideoRecord) => {
    setDeleteConfirm({ video, show: true });
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm?.video) {
      remove(deleteConfirm.video.id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm(null);
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
    // Replace status text (Ready/Queued/Processing) with uploaded time; keep "Failed" for clarity.
    const base = "px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide";
    const Dot = ({ color, pulse }: { color: string; pulse?: boolean }) => (
      <span
        className={`w-3 h-3 rounded-full ${color} ${
          pulse ? "animate-pulse" : ""
        }`}
      />
    );
    if (v.processStatus === "failed") {
      return (
        <span className={`${base} text-white flex items-center gap-1`}>
          <Dot color="bg-red-400" /> Failed
        </span>
      );
    }
    // queued / processing / ready all show timeAgo with color-coded dot
    const dotColor =
      v.processStatus === "ready"
        ? "bg-green-400"
        : v.processStatus === "processing" || v.processStatus === "queued"
        ? "bg-yellow-400"
        : "bg-slate-400";
    const pulse = v.processStatus !== "ready";
    return (
      <span className={`${base} text-white flex items-center gap-1`}>
        <Dot color={dotColor} pulse={pulse} /> {timeAgo(v.createdAt)}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center justify-between">
        <h3 className="font-semibold">Your Short Videos</h3>
        {loading && <div className="text-sm text-gray-500">Loading...</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {videos.map((v) => (
          <div
            key={v.id}
            className="border border-neutral-700 rounded-2xl p-2 space-y-1 bg-black backdrop-blur"
          >
            <div className="aspect-video bg-neutral-800 text-xs text-gray-500 relative overflow-hidden rounded-md group">
              {(() => {
                const displayThumb = localThumbs[v.id] || v.thumbnailUrl;
                const videoHref = v.ready720pUrl || v.originalUrl; // include bypassed originals
                if (displayThumb) {
                  return (
                    <a
                      href={v.processStatus === "ready" ? videoHref : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block w-full h-full ${
                        v.processStatus === "ready"
                          ? "cursor-pointer"
                          : "cursor-default"
                      }`}
                    >
                      <Image
                        src={displayThumb}
                        alt="thumb"
                        fill
                        sizes="(max-width:768px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {v.processStatus !== "ready" && (
                        <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center">
                          <span className="w-3 h-3 rounded-full bg-yellow-300 animate-pulse" />
                        </div>
                      )}
                    </a>
                  );
                }
                // Ready but no thumb yet: keep capture option (not link-wrapped to avoid nested interactive elements)
                if (v.processStatus === "ready") {
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        const videoEl = document.createElement("video");
                        videoEl.crossOrigin = "anonymous";
                        videoEl.src = videoHref;
                        videoEl.preload = "metadata";
                        videoEl.addEventListener("loadeddata", () => {
                          try {
                            videoEl.currentTime = Math.min(
                              0.15,
                              (videoEl.duration || 1) - 0.05
                            );
                          } catch {}
                        });
                        videoEl.addEventListener("seeked", () => {
                          try {
                            const canvas = document.createElement("canvas");
                            canvas.width = videoEl.videoWidth || 320;
                            canvas.height = videoEl.videoHeight || 180;
                            const ctx = canvas.getContext("2d");
                            if (!ctx) return;
                            ctx.drawImage(videoEl, 0, 0);
                            const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                            if (dataUrl.startsWith("data:image")) {
                              setLocalThumbs((lt) => ({
                                ...lt,
                                [v.id]: dataUrl,
                              }));
                            }
                          } catch {}
                          videoEl.remove();
                        });
                      }}
                      className="flex flex-col items-center justify-center gap-1 w-full h-full text-[10px] text-gray-400 hover:text-white transition-colors"
                    >
                      <span className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center">
                        📷
                      </span>
                      Capture thumb
                    </button>
                  );
                }
                return (
                  <div className="flex items-center justify-center w-full h-full">
                    <span className="w-3 h-3 rounded-full bg-yellow-300 animate-pulse" />
                  </div>
                );
              })()}
              {Date.now() - new Date(v.createdAt).getTime() < 2 * 60 * 1000 && (
                <span className="absolute top-1 left-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide shadow">
                  NEW
                </span>
              )}
            </div>
            <div className="flex justify-between items-center gap-2 pt-1">
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
                  onClick={() => handleDeleteClick(v)}
                  className="text-[10px] px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2Icon className="w-3 h-3" />
                </button>
              </div>
            </div>
            {v.errorMessage && v.processStatus === "failed" && (
              <div className="text-[10px] text-red-500 line-clamp-2">
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm?.show && (
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
                Delete Video?
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                This will permanently delete the video and cannot be undone.
              </p>
              <p className="text-xs text-gray-500">
                Status:{" "}
                <span className="font-medium">
                  {deleteConfirm.video.processStatus}
                </span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
