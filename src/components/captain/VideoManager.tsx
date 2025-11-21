"use client";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2Icon } from "lucide-react";
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

// Sortable Video Item Component
interface SortableVideoItemProps {
  video: VideoRecord;
  localThumb?: string;
  isRetrying: boolean;
  canReorder: boolean;
  onRetry: (id: string) => void;
  onDeleteClick: (video: VideoRecord) => void;
  statusPill: (v: VideoRecord) => React.ReactNode;
  setLastActivity: (time: number) => void;
  setLocalThumbs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

const SortableVideoItem: React.FC<SortableVideoItemProps> = ({
  video: v,
  localThumb,
  isRetrying,
  canReorder,
  onRetry,
  onDeleteClick,
  statusPill,
  setLastActivity,
  setLocalThumbs,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: v.id,
    disabled: !canReorder,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayThumb = localThumb || v.thumbnailUrl;
  const videoHref = v.ready720pUrl || v.originalUrl;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-2xl p-2 space-y-1 backdrop-blur transition-all ${
        isDragging
          ? "z-50 shadow-2xl border-blue-500 bg-blue-900/20"
          : canReorder
            ? "border-neutral-600 bg-black hover:border-neutral-500 hover:shadow-lg"
            : "border-neutral-700 bg-black"
      }`}
    >
      {/* Drag handle - only show when can reorder */}
      {canReorder ? (
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center gap-2 py-2 mb-1 -mx-2 transition-all border border-transparent rounded cursor-move group/drag hover:bg-neutral-800/70 hover:border-neutral-600 active:bg-neutral-700"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
          <span className="text-[10px] font-medium text-neutral-400 group-hover/drag:text-blue-400 transition-colors uppercase tracking-wider">
            Drag to Reorder
          </span>
          <GripVertical className="w-5 h-5 transition-colors text-neutral-400 group-hover/drag:text-blue-400" />
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 mb-1 -mx-2 transition-all border border-transparent rounded cursor-wait ">
          <svg
            className="w-5 h-5 transition-colors animate-spin text-neutral-400 group-hover/drag:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-[10px] font-medium text-neutral-400  transition-colors uppercase tracking-wider">
            Optimizing Video
          </span>
        </div>
      )}

      <div className="relative overflow-hidden text-xs text-gray-500 rounded-md aspect-video bg-neutral-800 group">
        {(() => {
          if (displayThumb) {
            return (
              <a
                href={v.processStatus === "ready" ? videoHref : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full h-full relative ${
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
                  <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center"></div>
                )}
              </a>
            );
          }

          if (v.processStatus === "ready") {
            return (
              <button
                type="button"
                onClick={() => {
                  setLastActivity(Date.now());
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
                      if (ctx) {
                        ctx.drawImage(videoEl, 0, 0);
                        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                        setLocalThumbs((prev) => ({
                          ...prev,
                          [v.id]: dataUrl,
                        }));
                      }
                    } catch (e) {
                      console.warn("thumb capture fail", e);
                    }
                  });
                }}
                className="flex items-center justify-center w-full h-full text-sm font-semibold text-blue-500"
              >
                Generate Thumbnail
              </button>
            );
          }

          return (
            <div className="flex items-center justify-center w-full h-full">
              <span className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse" />
            </div>
          );
        })()}
        {Date.now() - new Date(v.createdAt).getTime() < 2 * 60 * 1000 && (
          <span className="absolute top-1 left-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded-full font-semibold tracking-wide shadow">
            NEW
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {statusPill(v)}
        <div className="flex gap-1">
          {v.processStatus === "failed" && (
            <button
              type="button"
              onClick={() => onRetry(v.id)}
              disabled={isRetrying}
              className="text-[10px] px-2 py-0.5 rounded bg-amber-600 text-white disabled:opacity-50"
            >
              {isRetrying ? "…" : "Retry"}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDeleteClick(v)}
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
  );
};

interface VideoRecord {
  id: string;
  originalUrl: string;
  thumbnailUrl?: string | null;
  processStatus: string; // queued | processing | ready | failed
  createdAt: string;
  errorMessage?: string | null;
  ready720pUrl?: string | null;
  charterId?: string | null; // Charter this video is linked to
  order?: number; // Order in charter (from junction table)
  // didFallback & fallbackReason intentionally not surfaced in UI anymore
  didFallback?: boolean;
  fallbackReason?: string | null;
  // Blob storage keys for media validation
  normalizedBlobKey?: string | null;
  blobKey?: string | null;
  // Duration for video display and validation
  processedDurationSec?: number | null;
}
interface VideoManagerProps {
  ownerId: string;
  charterId?: string | null; // Optional: filter to only show videos linked to this charter
  onVideosChange?: (videos: VideoRecord[]) => void;
  onPendingChange?: (pending: boolean) => void;
  refreshToken?: number; // increment to force reload
  selectedVideoIds?: string[]; // For new charter: only show these video IDs
}

export const VideoManager: React.FC<VideoManagerProps> = ({
  ownerId,
  charterId,
  onVideosChange,
  onPendingChange,
  refreshToken,
  selectedVideoIds,
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
  const [_reordering, setReordering] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Activity tracking for smart polling
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isVisible, setIsVisible] = useState(true);
  const uploadTimestampsRef = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    setLoading(true);

    // Determine which endpoint to use:
    // - If charterId exists: fetch videos linked to that charter via junction table
    // - If charterId is null/undefined (new charter): fetch ALL user's videos, then filter by selectedVideoIds
    let url: string;
    if (charterId !== undefined && charterId !== null) {
      // Editing existing charter - fetch only linked videos
      url = `/api/videos/list?ownerId=${ownerId}&charterId=${charterId}`;
    } else {
      // New charter creation - fetch all user's videos using list-self
      url = `/api/videos/list-self`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      let incoming: VideoRecord[] = data.videos || [];

      // For new charters, filter to only show selected video IDs
      if (!charterId && selectedVideoIds && selectedVideoIds.length > 0) {
        incoming = incoming.filter((v) => selectedVideoIds.includes(v.id));
      }

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
        // Track upload timestamps for new non-ready videos
        incoming.forEach((v) => {
          if (
            v.processStatus !== "ready" &&
            !uploadTimestampsRef.current[v.id]
          ) {
            uploadTimestampsRef.current[v.id] = Date.now();
          }
        });
        return incoming;
      });
    }
    setLoading(false);
  }, [ownerId, charterId, selectedVideoIds]);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  // Handle drag end event
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      // Optimistically update the UI
      const newVideos = arrayMove(videos, oldIndex, newIndex);
      setVideos(newVideos);

      // Notify parent of the new order immediately (for form state)
      onVideosChange?.(newVideos);

      // If we have a charterId, persist the order to the server
      // If no charterId (new charter), just update local state for now
      if (charterId) {
        // Prepare reorder payload
        const videoOrders = newVideos.map((video, index) => ({
          videoId: video.id,
          order: index,
        }));

        setReordering(true);
        try {
          const res = await fetch(`/api/charters/${charterId}/videos/reorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ videoOrders }),
          });

          if (!res.ok) {
            // Revert on failure
            console.error("Failed to reorder videos");
            setVideos(videos);
            // Notify parent of revert
            onVideosChange?.(videos);
          }
        } catch (error) {
          console.error("Failed to reorder videos:", error);
          setVideos(videos);
          // Notify parent of revert
          onVideosChange?.(videos);
        } finally {
          setReordering(false);
        }
      }
    },
    [videos, charterId, onVideosChange]
  );

  // Page Visibility API: track when user switches tabs
  useEffect(() => {
    const handleVisibility = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      if (visible) {
        // User returned - track activity and refresh immediately if videos are pending
        setLastActivity(Date.now());
        const hasPending = videos.some((v) => v.processStatus !== "ready");
        if (hasPending) {
          load();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [load, videos]);

  // Smart polling with dynamic intervals and inactivity detection
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

    // Stop polling if no pending videos
    if (!hasPending) return;

    // Check inactivity timeout (2 minutes)
    const inactiveMs = Date.now() - lastActivity;
    const inactivityTimeout = 2 * 60 * 1000; // 2 minutes

    // Stop polling if inactive AND tab is hidden
    if (inactiveMs > inactivityTimeout && !isVisible) {
      console.log(
        "[VideoManager] Stopping poll: inactive for 2min + tab hidden"
      );
      return;
    }

    // Determine polling interval based on video upload age
    // Recent uploads (< 30s): poll every 3s for faster feedback
    // Older uploads: poll every 10s (waiting for worker callback)
    const now = Date.now();
    const hasRecentUpload = videos.some((v) => {
      if (v.processStatus === "ready") return false;
      const uploadTime = uploadTimestampsRef.current[v.id];
      if (!uploadTime) return false;
      return now - uploadTime < 30000; // 30 seconds
    });

    const pollInterval = hasRecentUpload ? 3000 : 10000; // 3s or 10s

    const t = setInterval(() => {
      // Recheck visibility and activity before each poll
      const stillVisible = !document.hidden;
      const stillActive = Date.now() - lastActivity < inactivityTimeout;

      if (stillVisible || stillActive) {
        load();
      }
    }, pollInterval);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, load, lastActivity, isVisible]);

  const remove = async (id: string) => {
    setLastActivity(Date.now()); // Track activity
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
    setLastActivity(Date.now()); // Track activity
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Your Short Videos</h3>
          {loading && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <svg
                className="w-4 h-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading...</span>
            </div>
          )}
        </div>

        {/* Reordering hint - show when there are ready videos */}
        {videos.some((v) => v.processStatus === "ready") && (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-blue-300 border rounded-lg border-blue-700/30">
            <GripVertical className="flex-shrink-0 w-4 h-4" />
            <span>
              <strong className="font-semibold">Tip:</strong> Drag videos by the
              handle to change their display order
            </span>
          </div>
        )}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={videos.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 ">
            {videos.map((v) => (
              <SortableVideoItem
                key={v.id}
                video={v}
                localThumb={localThumbs[v.id]}
                isRetrying={retrying[v.id] || false}
                canReorder={v.processStatus === "ready"}
                onRetry={retry}
                onDeleteClick={handleDeleteClick}
                statusPill={statusPill}
                setLastActivity={setLastActivity}
                setLocalThumbs={setLocalThumbs}
              />
            ))}
            {videos.length === 0 && !loading && (
              <div className="text-sm text-gray-500 col-span-full">
                No videos yet.
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm?.show && (
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
                Delete Video?
              </h3>
              <p className="mb-1 text-sm text-gray-600">
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
                className="flex-1 px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
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
