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
        setError(
          `Invalid file type: ${file.type}. Please select a video file.`
        );
        setLoading(false);
        return;
      }

      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      setLoading(true);
      setError(null);
      setDuration(0);
      setStartSec(0);
      setEndSec(30);
      setCurrentTime(0);
      setIsPlaying(false);
      setProbe({ width: 0, height: 0, codec: "", size: file.size });

      return () => {
        console.log("Revoking object URL");
        URL.revokeObjectURL(url);
      };
    } else {
      console.log("No file or modal closed, clearing object URL");
      setObjectUrl(null);
      setLoading(true);
    }
  }, [file, open]);

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
    } else {
      console.error("Invalid video duration:", videoRef.current?.duration);
      setError("Invalid video file or corrupted data");
      setLoading(false);
    }
  }, [file]);

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
          didFallback: false,
          fallbackReason: null,
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

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-white">Loading video...</span>
              <span className="mt-2 text-xs text-gray-400">
                If stuck, check file type and browser support.
              </span>
            </div>
          ) : (
            <>
              <div className="relative">
                <video
                  ref={videoRef}
                  src={objectUrl || undefined}
                  className="w-full max-h-80 bg-black rounded-lg cursor-pointer"
                  muted={isMuted}
                  preload="metadata"
                  playsInline
                  controls={false}
                  onClick={togglePlayPause}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onError={(e) => {
                    console.error("Video loading error:", e);
                    const target = e.target as HTMLVideoElement;
                    console.error("Video error details:", {
                      error: target.error,
                      networkState: target.networkState,
                      readyState: target.readyState,
                      src: target.src,
                    });
                    setError(
                      `Failed to load video: ${
                        target.error?.message || "Unknown error"
                      }`
                    );
                    setLoading(false);
                  }}
                  onCanPlay={() => {
                    console.log("Video can play");
                    if (
                      videoRef.current &&
                      videoRef.current.duration &&
                      !isNaN(videoRef.current.duration)
                    ) {
                      setLoading(false);
                    }
                  }}
                  onLoadStart={() => {
                    console.log("Video loading started");
                    setLoading(true);
                  }}
                  onLoadedData={() => {
                    console.log("Video data loaded");
                    // Sometimes onLoadedMetadata doesn't fire, so we try here too
                    if (
                      videoRef.current &&
                      videoRef.current.duration &&
                      !isNaN(videoRef.current.duration) &&
                      loading
                    ) {
                      console.log(
                        "Triggering metadata handling from onLoadedData"
                      );
                      handleLoadedMetadata();
                    }
                  }}
                  onCanPlayThrough={() => {
                    console.log("Video can play through");
                    // Final fallback to ensure we're not stuck loading
                    if (
                      videoRef.current &&
                      videoRef.current.duration &&
                      !isNaN(videoRef.current.duration) &&
                      loading
                    ) {
                      console.log(
                        "Triggering metadata handling from onCanPlayThrough"
                      );
                      handleLoadedMetadata();
                    }
                  }}
                />
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
                <div className="relative">
                  <div
                    ref={timelineRef}
                    className="relative h-16 bg-neutral-800 rounded overflow-hidden cursor-pointer"
                  >
                    <div className="absolute inset-0">
                      <div
                        className="absolute top-0 bottom-0 bg-black/60"
                        style={{ left: 0, width: `${startPercentage}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 bg-black/60"
                        style={{ left: `${endPercentage}%`, right: 0 }}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      />
                      <div
                        className="absolute top-0 bottom-0 border-2 border-blue-400 cursor-move hover:bg-blue-400/10 transition-colors"
                        style={{
                          left: `${startPercentage}%`,
                          width: `${endPercentage - startPercentage}%`,
                        }}
                        onMouseDown={(e) => handleTimelineDrag(e, "selection")}
                      />
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors flex items-center justify-center z-10"
                        style={{
                          left: `${startPercentage}%`,
                          transform: "translateX(-50%)",
                        }}
                        onMouseDown={(e) => handleTimelineDrag(e, "start")}
                      >
                        <div className="w-1 h-4 bg-white rounded"></div>
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-3 bg-blue-500 cursor-ew-resize hover:bg-blue-400 transition-colors flex items-center justify-center z-10"
                        style={{
                          left: `${endPercentage}%`,
                          transform: "translateX(-50%)",
                        }}
                        onMouseDown={(e) => handleTimelineDrag(e, "end")}
                      >
                        <div className="w-1 h-4 bg-white rounded"></div>
                      </div>
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
          )}
        </div>
      </div>
    </div>
  );
};
