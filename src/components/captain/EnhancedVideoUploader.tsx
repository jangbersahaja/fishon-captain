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
  charterId?: string | null; // Optional charterId to link videos during upload
}

export const EnhancedVideoUploader: React.FC<EnhancedVideoUploaderProps> = ({
  onUploaded,
  onQueueBlockingChange,
  maxFiles = 5,
  allowMultiple = true,
  autoStart = true,
  showQueue = true, // Changed default to true so users can see trim buttons
  charterId = null,
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
        // Create queue of files to trim
        const trimQueue = filesToUpload.map((file, index) => ({
          file,
          tempId: `temp-${Date.now()}-${index}`,
        }));

        // Open modal for first file
        const firstItem = trimQueue[0];
        setTrimTargetId(firstItem.tempId);
        setTrimFile(firstItem.file);
        setIsModalOpen(true);
        setTotalTrimFiles(trimQueue.length);

        // Store remaining files in pending queue
        if (trimQueue.length > 1) {
          setPendingTrimFiles(trimQueue.slice(1));
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [maxFiles, items.length]
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const previousCompletedCountRef = useRef(0);
  const [trimTargetId, setTrimTargetId] = useState<string | null>(null);
  const [trimFile, setTrimFile] = useState<File | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Multi-file trim queue
  const [pendingTrimFiles, setPendingTrimFiles] = useState<
    Array<{ file: File; tempId: string }>
  >([]);
  const [totalTrimFiles, setTotalTrimFiles] = useState(0);

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
          priority: "normal" as const,
          charterId: charterId,
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

    // Check if there are more files to trim
    if (pendingTrimFiles.length > 0) {
      const nextFile = pendingTrimFiles[0];
      const remainingFiles = pendingTrimFiles.slice(1);

      // Update state for next file
      setTrimTargetId(nextFile.tempId);
      setTrimFile(nextFile.file);
      setPendingTrimFiles(remainingFiles);
      // Keep modal open for next file
    } else {
      // No more files, close modal
      setIsModalOpen(false);
      setTrimTargetId(null);
      setTrimFile(null);
      setTotalTrimFiles(0);
    }
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
    setPendingTrimFiles([]); // Clear pending queue on cancel
    setTotalTrimFiles(0);
  };

  // removed getStatusColor (inline logic used)

  // removed canUploadMore & hasActiveUploads (not used after minimalist redesign)

  //TODO: Add video count from server to totalCount for accurate limiting

  return (
    <div className="w-full space-y-4">
      {/* Upload Button */}
      <button
        type="button"
        onClick={() => !blockMore && inputRef.current?.click()}
        disabled={blockMore}
        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#ec2227] transition-colors border border-[#ec2227]/60 rounded-md shadow-sm bg-[#ec2227]/10 hover:bg-[#ec2227]/20 "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        {blockMore
          ? "Maximum 10 videos reached"
          : `Upload Video${allowMultiple ? "s" : ""} (${totalCount}/${MAX_TOTAL})`}
      </button>

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
          <div className="p-3 mt-4 border border-blue-200 rounded-lg bg-blue-50">
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
                        <div className="w-4 h-4 border-2 border-blue-200 rounded-full border-t-blue-600 animate-spin"></div>
                      ) : (
                        <div className="w-4 h-4 bg-blue-100 rounded-full"></div>
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
            <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
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
                  className="relative flex flex-col gap-1 px-3 py-2 bg-white rounded-md shadow-sm ring-1 ring-gray-200/70"
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
          queuePosition={
            totalTrimFiles > 1
              ? {
                  current: totalTrimFiles - pendingTrimFiles.length,
                  total: totalTrimFiles,
                }
              : undefined
          }
          onChangeVideo={() => {
            // Close current trim modal and open file picker
            setIsModalOpen(false);
            setTrimTargetId(null);
            setTrimFile(null);
            setPendingTrimFiles([]);
            setTotalTrimFiles(0);
            inputRef.current?.click();
          }}
        />
      )}
    </div>
  );
};

export default EnhancedVideoUploader;
