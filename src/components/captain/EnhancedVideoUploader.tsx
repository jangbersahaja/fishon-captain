/**
 * Enhanced VideoUploader Component
 *
 * This is the new version that uses the VideoUploadQueue system with:
 * - Automatic retry and persistence
 * - Progress tracking and state management
 * - Thumbnail capture integration
 * - Better error handling and UX
 * - Multiple file support with queue management
 *
 * Replaces the legacy VideoUploader.tsx component
 */

"use client";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { VideoUploadItem } from "@/types/videoUpload";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { VideoTrimModal } from "./VideoTrimModal";

// Phase 8: Utility functions for enhanced progress display
const formatTransferSpeed = (bytesPerSecond: number): string => {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024)
    return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
};

const formatTimeRemaining = (seconds: number): string => {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

// Step-based progress utilities
const getUploadStep = (
  item: VideoUploadItem
): { step: number; total: number; label: string; details?: string } => {
  switch (item.status) {
    case "pending":
      return {
        step: 0,
        total: 3,
        label: "Waiting to start",
        details: "File queued for upload",
      };
    case "uploading":
      const progress = Math.round(item.progress * 100);
      const details = item.progressDetails?.transferSpeed
        ? `${formatTransferSpeed(item.progressDetails.transferSpeed)}${
            item.progressDetails.estimatedTimeRemaining &&
            item.progressDetails.estimatedTimeRemaining > 2 &&
            item.progress < 0.95
              ? ` • ${formatTimeRemaining(
                  item.progressDetails.estimatedTimeRemaining
                )} left`
              : item.progress >= 0.95
              ? " • finishing up..."
              : ""
          }`
        : `${progress}% uploaded`;
      return { step: 1, total: 3, label: "Uploading File", details };
    case "processing":
      return {
        step: 2,
        total: 3,
        label: "Processing Video",
        details: "Generating thumbnail and metadata",
      };
    case "done":
      return {
        step: 3,
        total: 3,
        label: "Complete",
        details: "Video ready for use",
      };
    case "error":
      const errorDetails = item.errorDetails?.message || item.error;
      const retryInfo =
        item.retryCount && item.retryCount > 0
          ? ` (Retry ${item.retryCount}/3)`
          : "";
      return {
        step: -1,
        total: 3,
        label: "Failed",
        details: `${errorDetails}${retryInfo}`,
      };
    case "canceled":
      return {
        step: -1,
        total: 3,
        label: "Canceled",
        details: "Upload was canceled",
      };
    default:
      return { step: 0, total: 3, label: "Unknown", details: "" };
  }
};

interface EnhancedVideoUploaderProps {
  onUploaded?: () => void;
  onQueueBlockingChange?: (blocking: boolean) => void; // Track client-side queue upload state
  maxFiles?: number;
  allowMultiple?: boolean;
  autoStart?: boolean;
  showQueue?: boolean;
}

export const EnhancedVideoUploader: React.FC<EnhancedVideoUploaderProps> = ({
  onUploaded,
  onQueueBlockingChange,
  maxFiles = 5,
  allowMultiple = true,
  autoStart = true,
  showQueue = true, // Changed default to true so users can see trim buttons
}) => {
  const {
    items,
    enqueue,
    cancel,
    retry,
    setMaxConcurrent,
    setAutoStart,
    startUpload,
    updatePendingTrim,
    // add remove method after queue update
    remove,
  } = useVideoQueue();

  // New: total video guard (max 10 overall)
  const MAX_TOTAL = 10;
  const totalCount = items.length; // later can come from server list as well
  const blockMore = totalCount >= MAX_TOTAL;

  // File selection handler must be declared before dependent callbacks
  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const fileArray = Array.from(files);
      const availableSlots = maxFiles - items.length;
      const filesToUpload = fileArray.slice(0, availableSlots);
      if (filesToUpload.length > 0) {
        const firstFile = filesToUpload[0];
        if (!allowMultiple || filesToUpload.length === 1) {
          const tempId = `temp-${Date.now()}`;
          setTrimTargetId(tempId);
          setTrimFile(firstFile);
          setIsModalOpen(true);
          if (filesToUpload.length > 1) {
            filesToUpload.slice(1).forEach((file) => enqueue(file));
          }
        } else {
          filesToUpload.forEach((file) => enqueue(file));
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [allowMultiple, enqueue, items.length, maxFiles]
  );

  // Drag & drop support
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (blockMore) return;
      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [blockMore, handleFileSelect]
  );
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const previousCompletedCountRef = useRef(0);
  const [trimTargetId, setTrimTargetId] = useState<string | null>(null);
  const [trimFile, setTrimFile] = useState<File | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set up queue configuration
  useEffect(() => {
    setAutoStart(autoStart);
    setMaxConcurrent(2); // Reasonable default for video uploads
  }, [autoStart, setAutoStart, setMaxConcurrent]);

  // Notify parent when uploads complete - only when count increases
  useEffect(() => {
    const completedCount = items.filter(
      (item) => item.status === "done"
    ).length;

    // Only call onUploaded when the completed count increases
    if (completedCount > previousCompletedCountRef.current && onUploaded) {
      previousCompletedCountRef.current = completedCount;
      onUploaded();
    } else if (completedCount === 0) {
      // Reset the counter when all items are cleared
      previousCompletedCountRef.current = 0;
    }
  }, [items, onUploaded]);

  // Notify parent about client-side queue blocking state (uploading/processing)
  useEffect(() => {
    const hasActiveUploads = items.some(
      (item) => item.status === "uploading" || item.status === "processing"
    );
    onQueueBlockingChange?.(hasActiveUploads);
  }, [items, onQueueBlockingChange]);

  // (handleFileSelect moved earlier)

  // openTrimModal removed in minimalist mode (trimming triggered only on initial select)

  const handleTrimConfirm = (
    slice: Blob,
    startSec: number,
    duration: number,
    probe: { width: number; height: number; codec: string; size: number },
    meta: { didFallback: boolean; fallbackReason?: string | null }
  ) => {
    if (trimTargetId && trimFile) {
      // Create new file from trimmed blob
      const trimmedFile = new File([slice], `${trimFile.name}_trimmed`, {
        type: trimFile.type || "video/mp4",
      });

      // Check if this is a temporary ID (auto-opened trim) or existing queue item
      if (trimTargetId.startsWith("temp-")) {
        // This is a new file - enqueue it with trim data
        enqueue({
          file: trimmedFile,
          trim: {
            startSec,
            endSec: startSec + duration,
            width: probe.width,
            height: probe.height,
            originalDurationSec: duration, // NOTE: currently passing trimmed selection; may replace with source duration if exposed
            didFallback: meta.didFallback,
            fallbackReason: meta.fallbackReason,
          },
          priority: "normal",
        });
      } else {
        // This is an existing queue item - update it
        updatePendingTrim(trimTargetId, {
          file: trimmedFile,
          trim: {
            startSec,
            endSec: startSec + duration,
            width: probe.width,
            height: probe.height,
            originalDurationSec: duration,
            didFallback: meta.didFallback,
            fallbackReason: meta.fallbackReason,
          },
        });
      }
    }
    setIsModalOpen(false);
    setTrimTargetId(null);
    setTrimFile(null);
  };

  const handleTrimClose = () => {
    // Requirement update: User cancellation should fully discard the file (do NOT enqueue)
    // If this was an auto-opened trim (temp id) we simply drop it and clear the file input so the
    // user can pick the same file again if desired.
    if (trimTargetId?.startsWith("temp-")) {
      if (inputRef.current) {
        inputRef.current.value = ""; // allow re-selecting same file
      }
    }
    setIsModalOpen(false);
    setTrimTargetId(null);
    setTrimFile(null);
  };

  // removed getStatusColor (inline logic used)

  // removed canUploadMore & hasActiveUploads (not used after minimalist redesign)

  return (
    <div className="space-y-4">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`border-2 border-dashed rounded-lg p-4 text-center text-sm transition ${
          blockMore
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-blue-400 border-gray-300"
        }`}
      >
        <p className="mb-2 font-medium">
          {blockMore
            ? "Maximum 10 videos reached"
            : "Drag & drop videos here or"}
        </p>
        <button
          type="button"
          onClick={() => !blockMore && inputRef.current?.click()}
          disabled={blockMore}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium disabled:opacity-50"
        >
          Select Video{allowMultiple ? "s" : ""}
        </button>
        <p className="mt-2 text-xs text-gray-500">
          Up to 5 concurrent uploads. Total limit 10.
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple={allowMultiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {/* Compact Upload Status (when queue is hidden but uploads are active) */}
      {!showQueue &&
        items.some(
          (item) => item.status === "uploading" || item.status === "processing"
        ) && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            {items
              .filter(
                (item) =>
                  item.status === "uploading" || item.status === "processing"
              )
              .map((item: VideoUploadItem) => {
                const stepInfo = getUploadStep(item);
                return (
                  <div key={item.id} className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {stepInfo.step > 0 && stepInfo.step < stepInfo.total ? (
                        <div className="w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-blue-100"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-blue-900 truncate">
                        {item.file.name}
                      </div>
                      <div className="text-xs text-blue-600">
                        {stepInfo.label}{" "}
                        {stepInfo.details && `• ${stepInfo.details}`}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

      {/* Upload Queue */}
      {showQueue && items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-600 tracking-wide uppercase">
              Uploads
            </h4>
            <span className="text-[10px] text-gray-400">
              {items.length} active
            </span>
          </div>
          <ul className="space-y-2">
            {items.map((item) => {
              const pct =
                item.status === "uploading"
                  ? Math.round(item.progress * 100)
                  : item.status === "done"
                  ? 100
                  : item.status === "processing"
                  ? 100
                  : 0;
              const statusLabel =
                item.status === "pending"
                  ? "Waiting"
                  : item.status === "uploading"
                  ? "Uploading"
                  : item.status === "processing"
                  ? "Processing"
                  : item.status === "done"
                  ? "Done"
                  : item.status === "error"
                  ? "Failed"
                  : "Canceled";
              const dotColor =
                item.status === "done"
                  ? "bg-emerald-500"
                  : item.status === "error"
                  ? "bg-red-500"
                  : item.status === "processing"
                  ? "bg-indigo-500"
                  : item.status === "uploading"
                  ? "bg-blue-500"
                  : item.status === "pending"
                  ? "bg-gray-300"
                  : "bg-gray-400";
              return (
                <li
                  key={item.id}
                  className="relative rounded-md bg-white ring-1 ring-gray-200/70 shadow-sm px-3 py-2 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span
                      className="truncate text-[11px] font-medium text-gray-800 flex-1"
                      title={item.file.name}
                    >
                      {item.file.name}
                    </span>
                    <span className="text-[10px] text-gray-500 tracking-wide">
                      {statusLabel}
                      {item.status === "uploading" && ` • ${pct}%`}
                    </span>
                    {item.status === "pending" && (
                      <button
                        onClick={() => startUpload(item.id)}
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Start
                      </button>
                    )}
                    {(item.status === "error" ||
                      item.status === "canceled") && (
                      <button
                        onClick={() => retry(item.id)}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Retry
                      </button>
                    )}
                    {(item.status === "error" ||
                      item.status === "canceled") && (
                      <button
                        onClick={() => remove(item.id)}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                        aria-label="Remove from queue"
                      >
                        Remove
                      </button>
                    )}
                    {(item.status === "pending" ||
                      item.status === "uploading") && (
                      <button
                        onClick={() => cancel(item.id)}
                        className="text-[12px] text-gray-400 hover:text-gray-600"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    )}
                    {item.status === "done" && (
                      <button
                        onClick={() => remove(item.id)}
                        className="text-[10px] text-gray-400 hover:text-gray-600"
                        aria-label="Clear"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {(item.status === "uploading" ||
                    item.status === "processing") && (
                    <div className="h-1.5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.status === "processing"
                            ? "bg-indigo-500 animate-pulse"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && (
                    <div className="text-[10px] text-red-600 line-clamp-1">
                      {item.errorDetails?.message ||
                        item.error ||
                        "Upload failed"}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Trim Modal */}
      {trimTargetId && trimFile && (
        <VideoTrimModal
          file={trimFile}
          open={isModalOpen}
          onClose={handleTrimClose}
          onConfirm={handleTrimConfirm}
          onChangeVideo={() => {
            // Close current trim modal and open file picker
            setIsModalOpen(false);
            setTrimTargetId(null);
            setTrimFile(null);
            inputRef.current?.click();
          }}
        />
      )}
    </div>
  );
};

export default EnhancedVideoUploader;
