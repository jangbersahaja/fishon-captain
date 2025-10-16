"use client";
import {
  trimMp4BoxKeyframeSlice,
  TrimResult,
} from "@/lib/video/trimMp4BoxKeyframeSlice";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { generateFrameThumbnails } from "./utils/generateFrameThumbnails";
// TODO(worker): Integrate AbortController + web worker pipeline for thumbnail & probe extraction.

interface VideoTrimModalProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onConfirm: (
    slice: Blob,
    startSec: number,
    duration: number,
    probe: { width: number; height: number; codec: string; size: number },
    meta: {
      didFallback: boolean;
      fallbackReason?: string | null;
      originalDurationSec?: number;
    }
  ) => void;
  onChangeVideo?: () => void;
}

export const VideoTrimModal: React.FC<VideoTrimModalProps> = ({
  file,
  open,
  onClose,
  onConfirm,
  onChangeVideo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec] = useState(30);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<
    "start" | "end" | "selection" | null
  >(null);
  // Touch drag tracking
  const activeTouchIdRef = useRef<number | null>(null);
  const [probe, setProbe] = useState<{
    width: number;
    height: number;
    codec: string;
    size: number;
  } | null>(null);
  // Internal guard to avoid double-resolving metadata
  const metadataResolvedRef = useRef(false);
  // Frame thumbnails (WhatsApp-style timeline)
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const [thumbsError, setThumbsError] = useState<string | null>(null);
  // Track cancellers for async work
  const thumbGenCancelRef = useRef<(() => void) | null>(null);

  // Derived readiness
  const isReady = !loading && duration > 0 && !!probe;

  // Check if video already meets requirements (≤30s, resolution not exceeding 1280x720)
  // Rationale: We treat any clip ≤30s and already at or below target dimensions as compliant (no need to upscale or transcode).
  // (Backend bypass uses width<=1280 && height<=720 with the same duration cap.)
  const isAlreadyCompliant =
    isReady &&
    probe &&
    duration <= 30 &&
    probe.width <= 1280 &&
    probe.height <= 720;

  // Check if user made any changes to the default selection
  const hasUserChanges = startSec !== 0 || endSec !== Math.min(30, duration);

  // Refactored: Use utility with AbortController stub
  const abortControllerRef = useRef<AbortController | null>(null);
  const runThumbnailGeneration = useCallback(
    (video: HTMLVideoElement) => {
      if (!video || !duration || !video.videoWidth || !video.videoHeight)
        return;
      // Cancel previous
      if (thumbGenCancelRef.current) {
        try {
          thumbGenCancelRef.current();
        } catch {}
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      setThumbsLoading(true);
      setThumbsError(null);
      const { promise, cancel } = generateFrameThumbnails(video, duration, {
        frameCount: 20,
        // Future: pass abortControllerRef.current.signal to worker
      });
      thumbGenCancelRef.current = cancel;
      promise
        .then((frames) => {
          setThumbnails(frames);
          setThumbsLoading(false);
        })
        .catch((err) => {
          setThumbsError(err?.message || "Thumbnail generation failed");
          setThumbsLoading(false);
        });
    },
    [duration]
  );

  // Trigger frame generation after metadata ready
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (video && duration > 0) {
      setThumbnails([]);
      runThumbnailGeneration(video);
    }
    return () => {
      if (thumbGenCancelRef.current) {
        try {
          thumbGenCancelRef.current();
        } catch {}
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [file, duration, open, runThumbnailGeneration]);

  // Create object URL when file changes
  useEffect(() => {
    if (file && open) {
      console.log(
        "Creating object URL for file:",
        file.name,
        file.size,
        file.type
      );

      // Validate file type and size
      if (!file.type.startsWith("video/")) {
        setError(
          `Invalid file type: ${file.type}. Please select a video file.`
        );
        setLoading(false);
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError(
          `File too large (${(file.size / 1024 / 1024).toFixed(
            1
          )}MB). Max allowed is 500MB.`
        );
        setLoading(false);
        return;
      }

      const url = URL.createObjectURL(file);
      console.log("Object URL created:", url);
      setObjectUrl(url);
      setLoading(true);
      console.log("Loading state set to true, waiting for video events...");
      setError(null);
      setDuration(0);
      setStartSec(0);
      setEndSec(30);
      setCurrentTime(0);
      setIsPlaying(false);
      setProbe({ width: 0, height: 0, codec: "", size: file.size });
      setThumbnails([]);
      // Reset metadata resolved guard for new file
      metadataResolvedRef.current = false;

      // Kick a microtask to force a load() call after src is bound in the next paint
      queueMicrotask(() => {
        if (videoRef.current) {
          try {
            videoRef.current.load();
          } catch {}
        }
      });

      return () => {
        console.log("Revoking object URL");
        URL.revokeObjectURL(url);
      };
    } else {
      console.log("No file or modal closed, clearing object URL");
      setObjectUrl(null);
      setLoading(true);
      metadataResolvedRef.current = false;
    }
  }, [file, open]);

  // Improved fast-load logic with short fallback (3s) instead of 15s
  useEffect(() => {
    if (!objectUrl || !loading) return;
    const video = videoRef.current;
    if (!video) return;

    const finalizeIfReady = (source: string) => {
      if (metadataResolvedRef.current) return;
      if (video.readyState >= 1 && video.duration && !isNaN(video.duration)) {
        console.log(`[fast-load] metadata ready via ${source}`);
        metadataResolvedRef.current = true;
        setLoading(false);
        const vw = video.videoWidth || 0;
        const vh = video.videoHeight || 0;
        setDuration(video.duration);
        setEndSec(Math.min(30, video.duration));
        setProbe({
          width: vw,
          height: vh,
          codec: "h264",
          size: file.size,
        });
        queueMicrotask(
          () => videoRef.current && runThumbnailGeneration(videoRef.current)
        );
        return true;
      }
      return false;
    };

    // Attach minimal listeners
    const handleLoadedMetadataFast = () => finalizeIfReady("loadedmetadata");
    const handleLoadedDataFast = () => finalizeIfReady("loadeddata");
    const handleCanPlay = () => finalizeIfReady("canplay");

    video.addEventListener("loadedmetadata", handleLoadedMetadataFast);
    video.addEventListener("loadeddata", handleLoadedDataFast);
    video.addEventListener("canplay", handleCanPlay);

    // Kick off an async microtask readiness check
    queueMicrotask(() => finalizeIfReady("microtask"));
    // And a short interval for stubborn browsers (Safari quirks)
    const shortPoll = setInterval(() => {
      if (finalizeIfReady("short-poll")) clearInterval(shortPoll);
    }, 120);

    // Short fallback timeout (3s)
    const timeout = setTimeout(() => {
      if (!metadataResolvedRef.current) {
        if (finalizeIfReady("timeout-fallback")) return;
        console.warn("[fast-load] fallback timeout reached (3s)");
        setLoading(false);
        setError(
          "Unable to read video metadata quickly. File may be unsupported."
        );
      }
    }, 3000);

    return () => {
      clearInterval(shortPoll);
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", handleLoadedMetadataFast);
      video.removeEventListener("loadeddata", handleLoadedDataFast);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [objectUrl, loading, file, runThumbnailGeneration]);

  // Handle video metadata loaded
  const handleLoadedMetadata = useCallback(() => {
    console.log("Video metadata loaded, duration:", videoRef.current?.duration);
    if (
      videoRef.current &&
      videoRef.current.duration &&
      !isNaN(videoRef.current.duration)
    ) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndSec(Math.min(30, videoDuration));
      setLoading(false);
      setError(null);
      setProbe({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
        codec: "h264",
        size: file.size,
      });
      // Kick off thumbnail generation (deferred to next microtask so videoRef updates)
      queueMicrotask(() => {
        if (videoRef.current) runThumbnailGeneration(videoRef.current);
      });
    } else {
      console.error("Invalid video duration:", videoRef.current?.duration);
      setError("Invalid video file or corrupted data");
      setLoading(false);
    }
  }, [file, runThumbnailGeneration]);

  // Handle video time updates
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      if (time >= endSec) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [endSec]);

  // Auto-seek to start point when selection changes
  useEffect(() => {
    if (videoRef.current && !isDragging) {
      videoRef.current.currentTime = startSec;
    }
  }, [startSec, isDragging]);

  // Handle play/pause state tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime >= endSec) {
        videoRef.current.currentTime = startSec;
      }
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [startSec, endSec]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMutedState = !isMuted;
    videoRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  }, [isMuted]);

  // Handle timeline drag
  const handleTimelineDrag = useCallback(
    (e: React.MouseEvent, handle: "start" | "end" | "selection") => {
      if (!isReady) return; // guard during loading
      if (!timelineRef.current) return;
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
      setIsDragging(handle);
      const timeline = timelineRef.current;
      const rect = timeline.getBoundingClientRect();
      const initialSelectionDuration = endSec - startSec;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        // Clamp helpers
        const clamp = (v: number, min = 0, max = duration) =>
          Math.max(min, Math.min(max, v));
        if (handle === "start") {
          const newStart = clamp(Math.min(time, endSec - 0.25));
          setStartSec(newStart);
          // Ensure at least 0.25s selection window
          if (endSec - newStart < 0.25) setEndSec(clamp(newStart + 0.25));
        } else if (handle === "end") {
          const newEnd = clamp(Math.max(time, startSec + 0.25));
          const maxEnd = clamp(startSec + 30, 0, duration);
          setEndSec(Math.min(newEnd, maxEnd));
        } else if (handle === "selection") {
          const newStart = clamp(
            Math.min(time, duration - initialSelectionDuration)
          );
          const newEnd = clamp(newStart + initialSelectionDuration);
          setStartSec(newStart);
          setEndSec(newEnd);
        }
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [duration, startSec, endSec, isReady]
  );

  // Unified drag logic for touch events
  const beginTouchDrag = useCallback(
    (e: React.TouchEvent, handle: "start" | "end" | "selection") => {
      if (!isReady || !timelineRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      activeTouchIdRef.current = touch.identifier;
      const video = videoRef.current;
      if (video && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
      setIsDragging(handle);
      const rect = timelineRef.current.getBoundingClientRect();
      const initialSelectionDuration = endSec - startSec;

      const onMove = (moveEvent: TouchEvent) => {
        const t = Array.from(moveEvent.changedTouches).find(
          (tt) => tt.identifier === activeTouchIdRef.current
        );
        if (!t) return;
        const x = t.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;
        const clamp = (v: number, min = 0, max = duration) =>
          Math.max(min, Math.min(max, v));
        if (handle === "start") {
          const newStart = clamp(Math.min(time, endSec - 0.25));
          setStartSec(newStart);
          if (endSec - newStart < 0.25) setEndSec(clamp(newStart + 0.25));
        } else if (handle === "end") {
          const newEnd = clamp(Math.max(time, startSec + 0.25));
          const maxEnd = clamp(startSec + 30, 0, duration);
          setEndSec(Math.min(newEnd, maxEnd));
        } else if (handle === "selection") {
          const newStart = clamp(
            Math.min(time, duration - initialSelectionDuration)
          );
          const newEnd = clamp(newStart + initialSelectionDuration);
          setStartSec(newStart);
          setEndSec(newEnd);
        }
      };
      const onEnd = (endEvent: TouchEvent) => {
        const ended = Array.from(endEvent.changedTouches).some(
          (tt) => tt.identifier === activeTouchIdRef.current
        );
        if (!ended) return;
        activeTouchIdRef.current = null;
        setIsDragging(null);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
      };
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
      // Light haptic (best-effort)
      try {
        if (navigator.vibrate) navigator.vibrate(10);
      } catch {}
    },
    [isReady, duration, startSec, endSec]
  );

  const handleConfirm = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const actualDuration = endSec - startSec;

      // Optimization: Skip trimming for compliant videos with no user changes
      if (isAlreadyCompliant && !hasUserChanges) {
        console.log("Video already compliant, skipping trim processing");
        if (probe) {
          onConfirm(file, 0, duration, probe, {
            didFallback: false,
            fallbackReason: "No processing needed - video already compliant",
          });
        }
        return;
      }

      const result: TrimResult = await trimMp4BoxKeyframeSlice(
        file,
        startSec,
        actualDuration
      );
      if (probe) {
        onConfirm(result.blob, startSec, actualDuration, probe, {
          didFallback: result.didFallback,
          fallbackReason: result.fallbackReason || null,
          originalDurationSec: duration,
        });
      }
    } catch (err) {
      console.error("Trim error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  }, [
    file,
    startSec,
    endSec,
    probe,
    onConfirm,
    isAlreadyCompliant,
    hasUserChanges,
    duration,
  ]);

  if (!open || !file) return null;

  const selectedDuration = endSec - startSec;
  // Enhanced bitrate-based estimation (averages + overhead cushion ~4%)
  const averageBitrateBytesPerSec = duration > 0 ? file.size / duration : 0;
  const rawEstimate = averageBitrateBytesPerSec * selectedDuration;
  const estimatedOutputBytes = rawEstimate * 1.04; // small container overhead cushion
  const exceedsMax = estimatedOutputBytes > 150 * 1024 * 1024;
  const startPercentage = (startSec / duration) * 100;
  const endPercentage = (endSec / duration) * 100;

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Trim Video</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close trim modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* File + metadata summary */}
          <div className="p-3 bg-neutral-800 rounded text-xs text-gray-200 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="space-y-0.5">
              <div className="text-sm font-medium text-white break-all max-w-[70vw] sm:max-w-none">
                {file.name}
              </div>
              <div className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{file.type || "unknown type"}</span>
                {probe && (
                  <>
                    <span>
                      {probe.width}×{probe.height}
                    </span>
                    <span>{(probe.size / 1024 / 1024).toFixed(2)}MB</span>
                    <span>{duration.toFixed(1)}s total</span>
                  </>
                )}
              </div>
            </div>
            {error &&
              (onChangeVideo ? (
                <button
                  type="button"
                  onClick={onChangeVideo}
                  className="self-start sm:self-auto px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                >
                  Change Video
                </button>
              ) : null)}
          </div>

          {error && (
            <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              <p className="font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Always mount video so events can fire; overlay spinner while loading */}
          <>
            <div className="relative">
              <video
                ref={videoRef}
                src={objectUrl || undefined}
                className="w-full max-h-80 bg-black rounded-lg cursor-pointer"
                muted={isMuted}
                preload="auto"
                playsInline
                controls={false}
                onClick={togglePlayPause}
                onLoadedMetadata={() => {
                  // Keep existing handler for debug logs; fast path will already have run.
                  if (!metadataResolvedRef.current) {
                    handleLoadedMetadata();
                    metadataResolvedRef.current = true;
                  }
                }}
                onTimeUpdate={handleTimeUpdate}
                onError={(e) => {
                  console.error("Video loading error:", e);
                  const target = e.target as HTMLVideoElement;
                  const errorDetails = {
                    error: target.error,
                    errorCode: target.error?.code,
                    errorMessage: target.error?.message,
                    networkState: target.networkState,
                    readyState: target.readyState,
                    src: target.src,
                    fileType: file?.type,
                    fileSize: file?.size,
                  };
                  console.error("Detailed video error:", errorDetails);
                  setError(
                    `Failed to load video: ${
                      target.error?.message || "Unknown error"
                    }. Error code: ${target.error?.code || "unknown"}`
                  );
                  setLoading(false);
                }}
                onCanPlay={() => {
                  console.log("Video can play - stopping loading");
                  setLoading(false);
                }}
                onLoadStart={() => {
                  console.log(
                    "Video loading started (not changing loading state)"
                  );
                  // Don't set loading here as it conflicts with other handlers
                }}
                onLoadedData={() => {
                  if (!metadataResolvedRef.current) {
                    handleLoadedMetadata();
                    metadataResolvedRef.current = true;
                  }
                }}
                onCanPlayThrough={() => {
                  if (!metadataResolvedRef.current) {
                    handleLoadedMetadata();
                    metadataResolvedRef.current = true;
                  }
                }}
              />
              {loading && (
                <div
                  className="absolute inset-0 flex flex-col gap-3 p-4 bg-neutral-900/80 backdrop-blur-sm rounded-lg"
                  role="alert"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <div className="flex-1 w-full flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full border-4 border-neutral-600 border-t-blue-500 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-40 bg-neutral-700 rounded animate-pulse" />
                    <div className="h-2 w-64 bg-neutral-800 rounded animate-pulse" />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        className="px-3 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                        onClick={() => {
                          const video = videoRef.current;
                          console.log("[trim-debug] state", {
                            readyState: video?.readyState,
                            networkState: video?.networkState,
                            duration: video?.duration,
                            videoWidth: video?.videoWidth,
                            videoHeight: video?.videoHeight,
                            src: video?.currentSrc,
                          });
                          if (video && video.readyState === 0) {
                            try {
                              video.load();
                            } catch {}
                          }
                          if (video && video.readyState >= 1) setLoading(false);
                        }}
                      >
                        Debug
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        onClick={() => setLoading(false)}
                      >
                        Force Stop
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={() => {
                          if (objectUrl && videoRef.current) {
                            setLoading(true);
                            setError(null);
                            metadataResolvedRef.current = false;
                            try {
                              videoRef.current.load();
                            } catch {}
                          }
                        }}
                      >
                        Retry
                      </button>
                    </div>
                    <div className="text-xs text-gray-400">
                      Loading video metadata...
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex items-center justify-center w-10 h-10 bg-black/70 hover:bg-black/80 text-white rounded-full transition-colors"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 ml-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="absolute bottom-2 right-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="flex items-center justify-center w-10 h-10 bg-black/70 hover:bg-black/80 text-white rounded-full transition-colors"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.792L5.777 14H4a2 2 0 01-2-2V8a2 2 0 012-2h1.777l2.606-2.792A1 1 0 019.383 3.076zM13.646 5.646a.5.5 0 01.708 0L15.707 7l1.353-1.354a.5.5 0 11.708.708L16.414 7.5l1.354 1.354a.5.5 0 11-.708.708L15.707 8.207l-1.353 1.353a.5.5 0 11-.708-.708L14.793 7.5l-1.147-1.146a.5.5 0 010-.708z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.792L5.777 14H4a2 2 0 01-2-2V8a2 2 0 012-2h1.777l2.606-2.792A1 1 0 019.383 3.076zM14.657 2.929a.5.5 0 01.708 0A11.952 11.952 0 0118 8c0 1.953-.468 3.798-1.296 5.428a.5.5 0 11-.838-.556A10.952 10.952 0 0017 8c0-1.563-.383-3.034-1.071-4.314a.5.5 0 010-.757z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Preview: {startSec.toFixed(1)}s - {endSec.toFixed(1)}s (
                {selectedDuration.toFixed(1)}s)
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-white text-sm sm:text-base font-medium">
                Select clip duration (max 30s)
              </div>
              <div className="relative" ref={timelineRef}>
                <div
                  className={`relative h-20 bg-neutral-800 rounded overflow-hidden cursor-pointer select-none touch-none ${
                    !isReady ? "opacity-60 pointer-events-none" : ""
                  }`}
                >
                  {/* Thumbnails Row */}
                  <div className="absolute inset-0 flex">
                    {thumbnails.length > 0 && !thumbsLoading ? (
                      thumbnails.map((src, i) => (
                        <div
                          key={i}
                          className="flex-1 h-full bg-neutral-700 bg-center bg-cover"
                          style={{ backgroundImage: `url(${src})` }}
                        />
                      ))
                    ) : thumbsLoading || loading ? (
                      Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-full bg-neutral-700/40 animate-pulse"
                        />
                      ))
                    ) : thumbsError ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-red-400">
                        {thumbsError}
                      </div>
                    ) : (
                      Array.from({ length: 20 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-full bg-neutral-700/20"
                        />
                      ))
                    )}
                  </div>
                  {/* Unselected masks */}
                  <div
                    className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
                    style={{ left: 0, width: `${startPercentage}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
                    style={{ left: `${endPercentage}%`, right: 0 }}
                  />
                  {/* Current playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                    style={{ left: `${(currentTime / duration) * 100}%` }}
                  />
                  {/* Selection overlay */}
                  <div
                    className="absolute top-0 bottom-0 border-2 border-blue-400 cursor-move hover:bg-blue-400/10 transition-colors z-20"
                    style={{
                      left: `${startPercentage}%`,
                      width: `${endPercentage - startPercentage}%`,
                    }}
                    onMouseDown={(e) => handleTimelineDrag(e, "selection")}
                    onTouchStart={(e) => beginTouchDrag(e, "selection")}
                  />
                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-4 sm:w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 active:scale-[1.08] transition-all flex items-center justify-center z-30"
                    style={{
                      left: `${startPercentage}%`,
                      transform: "translateX(-50%)",
                    }}
                    onMouseDown={(e) => handleTimelineDrag(e, "start")}
                    onTouchStart={(e) => beginTouchDrag(e, "start")}
                  >
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-4 sm:w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 active:scale-[1.08] transition-all flex items-center justify-center z-30"
                    style={{
                      left: `${endPercentage}%`,
                      transform: "translateX(-50%)",
                    }}
                    onMouseDown={(e) => handleTimelineDrag(e, "end")}
                    onTouchStart={(e) => beginTouchDrag(e, "end")}
                  >
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-[11px] sm:text-xs text-gray-400">
                <span>0:00</span>
                <span className="text-white font-medium">
                  {Math.floor(selectedDuration / 60)}:
                  {(selectedDuration % 60).toFixed(0).padStart(2, "0")}s
                  selected
                </span>
                <span>
                  {Math.floor(duration / 60)}:
                  {(duration % 60).toFixed(0).padStart(2, "0")}
                </span>
              </div>
            </div>
            {selectedDuration > 30 && (
              <div className="text-amber-400 text-xs sm:text-sm">
                ⚠️ Max 30s allowed
              </div>
            )}
            {selectedDuration <= 30 && (
              <div className="text-[11px] sm:text-xs text-gray-400 flex items-center gap-3 flex-wrap">
                <span>
                  Size≈{(estimatedOutputBytes / 1024 / 1024).toFixed(1)}MB
                </span>
                <span>
                  Bitrate≈{((averageBitrateBytesPerSec * 8) / 1000).toFixed(0)}
                  kbps
                </span>
                {exceedsMax && (
                  <span className="text-red-400 font-semibold">
                    {">"}150MB (trim more)
                  </span>
                )}
              </div>
            )}
            {isAlreadyCompliant && (
              <div className="text-green-400 text-xs sm:text-sm flex items-center gap-2">
                ✅ Video already meets requirements ({probe?.width}×
                {probe?.height}, {duration.toFixed(1)}s)
                {!hasUserChanges && (
                  <span className="text-green-300">• No processing needed</span>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-neutral-700">
              <div className="text-[11px] sm:text-xs text-gray-400 order-2 sm:order-1">
                Tip: Tap video to play/pause; drag handles to adjust timing.
              </div>
              <div className="flex items-center gap-2 sm:gap-3 order-1 sm:order-2 flex-wrap">
                {onChangeVideo && (
                  <button
                    type="button"
                    className="px-3 sm:px-4 py-2 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition-colors text-xs sm:text-sm"
                    onClick={onChangeVideo}
                  >
                    Change Video
                  </button>
                )}
                <button
                  type="button"
                  className="px-3 sm:px-4 py-2 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition-colors text-xs sm:text-sm"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 sm:px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm"
                  onClick={handleConfirm}
                  disabled={
                    !!error || exporting || selectedDuration > 30 || exceedsMax
                  }
                >
                  {exporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      {isAlreadyCompliant && !hasUserChanges
                        ? "Processing..."
                        : exceedsMax
                        ? "Too Large"
                        : "Exporting..."}
                    </div>
                  ) : isAlreadyCompliant && !hasUserChanges ? (
                    `Use Original (${duration.toFixed(1)}s)`
                  ) : exceedsMax ? (
                    `Too Large (${selectedDuration.toFixed(1)}s)`
                  ) : (
                    `Confirm (${selectedDuration.toFixed(1)}s)`
                  )}
                </button>
              </div>
            </div>
          </>
        </div>
      </div>
    </div>
  );
};
