"use client";
import {
  trimMp4BoxKeyframeSlice,
  TrimResult,
} from "@/lib/video/trimMp4BoxKeyframeSlice";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface VideoTrimModalProps {
  file: File;
  open: boolean;
  onClose: () => void;
  onConfirm: (
    slice: Blob,
    startSec: number,
    duration: number,
    probe: { width: number; height: number; codec: string; size: number },
    meta: { didFallback: boolean; fallbackReason?: string | null }
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

  // ---------- Frame Thumbnail Generation Logic ----------
  const generateFrameThumbnails = useCallback(
    async (video: HTMLVideoElement, frameCount: number = 20) => {
      if (!video || !video.videoWidth || !video.videoHeight || !duration)
        return;
      setThumbsLoading(true);
      setThumbsError(null);
      const frames: string[] = [];
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setThumbsError("Canvas context unavailable");
        setThumbsLoading(false);
        return;
      }
      // Fixed thumbnail size (maintain aspect ratio approximate)
      const targetW = 60;
      const targetH = 34;
      canvas.width = targetW;
      canvas.height = targetH;

      let cancelled = false;
      // Capture previous src/time to restore if needed
      const originalTime = video.currentTime;
      const captureTimes = Array.from(
        { length: frameCount },
        (_, i) => (i / (frameCount - 1)) * duration
      );

      const seekTo = (time: number) =>
        new Promise<void>((resolve) => {
          const handle = () => {
            video.removeEventListener("seeked", handle);
            resolve();
          };
          // Some browsers (Safari) may fire 'timeupdate' only; add fallback
          const fallback = () => {
            if (Math.abs(video.currentTime - time) < 0.05) {
              cleanup();
              resolve();
            }
          };
          const cleanup = () => {
            video.removeEventListener("seeked", handle);
            video.removeEventListener("timeupdate", fallback);
          };
          video.addEventListener("seeked", handle);
          video.addEventListener("timeupdate", fallback);
          try {
            video.currentTime = time;
          } catch {
            // If seeking fails, resolve anyway to avoid hanging
            cleanup();
            resolve();
          }
        });

      for (const t of captureTimes) {
        if (cancelled) break;
        // Pause to stabilize frame
        try {
          video.pause();
        } catch {}
        await seekTo(t);
        try {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          frames.push(dataUrl);
        } catch (e) {
          console.warn("Frame capture failed", e);
        }
      }
      if (!cancelled) setThumbnails(frames);
      setThumbsLoading(false);
      // Restore original time (non-blocking)
      try {
        video.currentTime = originalTime;
      } catch {}
      return () => {
        cancelled = true;
      };
    },
    [duration]
  );

  // Trigger frame generation after metadata ready
  useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (video && duration > 0) {
      // Reset previous frames when file changes
      setThumbnails([]);
      generateFrameThumbnails(video);
    }
  }, [file, duration, open, generateFrameThumbnails]);

  // Create object URL when file changes
  useEffect(() => {
    if (file && open) {
      console.log(
        "Creating object URL for file:",
        file.name,
        file.size,
        file.type
      );

      // Validate file type
      if (!file.type.startsWith("video/")) {
        console.error("Invalid file type:", file.type);
        setError(
          `Invalid file type: ${file.type}. Please select a video file.`
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
          () => videoRef.current && generateFrameThumbnails(videoRef.current)
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
  }, [objectUrl, loading, file, generateFrameThumbnails]);

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
        if (videoRef.current) generateFrameThumbnails(videoRef.current);
      });
    } else {
      console.error("Invalid video duration:", videoRef.current?.duration);
      setError("Invalid video file or corrupted data");
      setLoading(false);
    }
  }, [file, generateFrameThumbnails]);

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

        if (handle === "start") {
          const newStart = Math.max(0, Math.min(time, endSec - 1));
          setStartSec(newStart);
        } else if (handle === "end") {
          const newEnd = Math.min(duration, Math.max(time, startSec + 1));
          const maxEnd = Math.min(startSec + 30, duration);
          setEndSec(Math.min(newEnd, maxEnd));
        } else if (handle === "selection") {
          const newStart = Math.max(
            0,
            Math.min(time, duration - initialSelectionDuration)
          );
          const newEnd = newStart + initialSelectionDuration;
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
    [duration, startSec, endSec]
  );

  const handleConfirm = useCallback(async () => {
    setExporting(true);
    setError(null);
    try {
      const actualDuration = endSec - startSec;
      const result: TrimResult = await trimMp4BoxKeyframeSlice(
        file,
        startSec,
        actualDuration
      );
      if (probe) {
        onConfirm(result.blob, startSec, actualDuration, probe, {
          didFallback: result.didFallback,
          fallbackReason: result.fallbackReason || null,
        });
      }
    } catch (err) {
      console.error("Trim error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setExporting(false);
    }
  }, [file, startSec, endSec, probe, onConfirm]);

  if (!open || !file) return null;

  const selectedDuration = endSec - startSec;
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

          {/* Debug info for troubleshooting infinite loading */}
          <div className="p-2 bg-neutral-800 rounded text-xs text-gray-300 mb-2">
            <div>
              file: <b>{file?.name}</b> ({file?.type}, {file?.size} bytes)
            </div>
            <div>
              objectUrl:{" "}
              <span className="break-all">{objectUrl || "(none)"}</span>
            </div>
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
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
                  <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin" />
                  <span className="mt-3 text-white text-sm">
                    Loading video...
                  </span>
                  <span className="mt-1 text-xs text-gray-400">
                    If stuck, click Debug.
                  </span>
                  <div className="mt-4 flex gap-2">
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
                  </div>
                </div>
              )}
              <div className="absolute bottom-2 left-2">
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex items-center justify-center w-10 h-10 bg-black/70 hover:bg-black/80 text-white rounded-full transition-colors"
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
              <div className="text-white text-sm font-medium">
                Select clip duration (max 30s)
              </div>
              <div className="relative" ref={timelineRef}>
                <div className="relative h-20 bg-neutral-800 rounded overflow-hidden cursor-pointer select-none">
                  {/* Thumbnails Row */}
                  <div className="absolute inset-0 flex">
                    {thumbnails.length > 0 ? (
                      thumbnails.map((src, i) => (
                        <div
                          key={i}
                          className="flex-1 h-full bg-neutral-700 bg-center bg-cover"
                          style={{ backgroundImage: `url(${src})` }}
                        />
                      ))
                    ) : thumbsLoading ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
                        Generating previews...
                      </div>
                    ) : thumbsError ? (
                      <div className="flex-1 flex items-center justify-center text-xs text-red-400">
                        {thumbsError}
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-gray-500">
                        No previews
                      </div>
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
                  />
                  {/* Start handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors flex items-center justify-center z-30"
                    style={{
                      left: `${startPercentage}%`,
                      transform: "translateX(-50%)",
                    }}
                    onMouseDown={(e) => handleTimelineDrag(e, "start")}
                  >
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                  {/* End handle */}
                  <div
                    className="absolute top-0 bottom-0 w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors flex items-center justify-center z-30"
                    style={{
                      left: `${endPercentage}%`,
                      transform: "translateX(-50%)",
                    }}
                    onMouseDown={(e) => handleTimelineDrag(e, "end")}
                  >
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
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
            {probe && (
              <div className="flex items-center gap-6 text-xs text-gray-400">
                <span>
                  {probe.width}×{probe.height}
                </span>
                <span>{(probe.size / 1024 / 1024).toFixed(2)}MB</span>
                <span>Duration: {duration.toFixed(1)}s</span>
                {selectedDuration > 30 && (
                  <span className="text-amber-400">⚠️ Max 30s allowed</span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between pt-4 border-t border-neutral-700">
              <div className="text-xs text-gray-400">
                Tip: Click video to play/pause, drag handles to adjust timing
              </div>
              <div className="flex items-center gap-3">
                {onChangeVideo && (
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition-colors"
                    onClick={onChangeVideo}
                  >
                    Change Video
                  </button>
                )}
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 transition-colors"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  onClick={handleConfirm}
                  disabled={exporting || selectedDuration > 30}
                >
                  {exporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                      Exporting...
                    </div>
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
