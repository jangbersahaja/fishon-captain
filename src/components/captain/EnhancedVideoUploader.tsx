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
import React, { useEffect, useRef, useState } from "react";
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
  maxFiles?: number;
  allowMultiple?: boolean;
  autoStart?: boolean;
  showQueue?: boolean;
}

export const EnhancedVideoUploader: React.FC<EnhancedVideoUploaderProps> = ({
  onUploaded,
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
    pause,
    resume,
    setMaxConcurrent,
    setAutoStart,
    startUpload,
    updatePendingTrim,
  } = useVideoQueue();

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

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const availableSlots = maxFiles - items.length;
    const filesToUpload = fileArray.slice(0, availableSlots);

    if (filesToUpload.length > 0) {
      const firstFile = filesToUpload[0];

      // For single file selection or first file in multiple selection, open trim modal immediately
      if (!allowMultiple || filesToUpload.length === 1) {
        // Create a temporary ID for the trim session
        const tempId = `temp-${Date.now()}`;
        setTrimTargetId(tempId);
        setTrimFile(firstFile);
        setIsModalOpen(true);

        // Store remaining files for after trim completion
        if (filesToUpload.length > 1) {
          // Store remaining files to enqueue after trim
          filesToUpload.slice(1).forEach((file) => {
            enqueue(file);
          });
        }
      } else {
        // Multiple files selected - enqueue all and let user manually trim if needed
        filesToUpload.forEach((file) => {
          enqueue(file);
        });
      }
    }

    // Clear input for next selection
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const openTrimModal = (item: VideoUploadItem) => {
    // Allow trimming for pending items, or if upload hasn't started processing yet
    if (
      item.status === "pending" ||
      (item.status === "uploading" && item.progress < 0.1)
    ) {
      // If uploading, cancel it first to allow trimming
      if (item.status === "uploading") {
        cancel(item.id);
      }
      setTrimTargetId(item.id);
      setTrimFile(item.file);
      setIsModalOpen(true);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-gray-500";
      case "uploading":
        return "bg-blue-500";
      case "processing":
        return "bg-yellow-500";
      case "done":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "canceled":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const canUploadMore = items.length < maxFiles;
  const hasActiveUploads = items.some(
    (item) => item.status === "uploading" || item.status === "processing"
  );

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUploadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {allowMultiple ? "Select Videos" : "Select Video"}
          </button>

          {items.length > 0 && (
            <div className="flex items-center gap-2">
              {hasActiveUploads && (
                <>
                  <button
                    type="button"
                    onClick={pause}
                    className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                  >
                    Pause
                  </button>
                  <button
                    type="button"
                    onClick={resume}
                    className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    Resume
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="text-sm text-gray-600">
            {items.length}/{maxFiles} videos
          </div>
        )}
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
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Upload Queue</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {items.map((item: VideoUploadItem) => (
              <div
                key={item.id}
                className="border rounded-lg p-3 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="font-medium text-sm truncate max-w-xs"
                    title={item.file.name}
                  >
                    {item.file.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded text-white font-medium ${getStatusColor(
                        item.status
                      )}`}
                    >
                      {item.status.toUpperCase()}
                    </span>

                    {(item.status === "pending" ||
                      (item.status === "uploading" && item.progress < 0.1)) && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => openTrimModal(item)}
                          className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                          title={
                            item.status === "uploading"
                              ? "Cancel and trim video"
                              : "Trim video"
                          }
                        >
                          Trim
                        </button>
                        {item.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => startUpload(item.id)}
                            className="text-green-600 hover:text-green-700 text-xs px-2 py-1 border border-green-200 rounded hover:bg-green-50"
                            title="Start upload"
                          >
                            Start
                          </button>
                        )}
                      </div>
                    )}

                    {(item.status === "uploading" ||
                      item.status === "processing") && (
                      <button
                        type="button"
                        onClick={() => cancel(item.id)}
                        className="text-red-600 hover:text-red-700 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50"
                        title="Cancel upload"
                      >
                        Cancel
                      </button>
                    )}

                    {(item.status === "error" ||
                      item.status === "canceled") && (
                      <button
                        type="button"
                        onClick={() => retry(item.id)}
                        className="text-blue-600 hover:text-blue-700 text-xs px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                        title="Retry upload"
                      >
                        Retry
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => cancel(item.id)}
                      className="text-gray-400 hover:text-gray-600 ml-2"
                      title="Remove from queue"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Step-based Progress Display */}
                {(() => {
                  const stepInfo = getUploadStep(item);
                  return (
                    <div className="space-y-3">
                      {/* Step Indicator */}
                      <div className="flex items-center space-x-3">
                        {/* Step Icon/Spinner */}
                        <div className="flex-shrink-0">
                          {stepInfo.step === -1 ? (
                            // Error or Canceled
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                              <span className="text-red-600 text-sm font-bold">
                                !
                              </span>
                            </div>
                          ) : stepInfo.step === stepInfo.total ? (
                            // Completed
                            <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-green-600 text-sm">✓</span>
                            </div>
                          ) : stepInfo.step > 0 ? (
                            // In Progress - Spinner
                            <div className="w-6 h-6 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"></div>
                          ) : (
                            // Pending
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-gray-400 text-sm">
                                {stepInfo.step + 1}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Step Label and Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm text-gray-900">
                              {stepInfo.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {Math.round(
                                (item.sizeBytes / 1024 / 1024) * 100
                              ) / 100}{" "}
                              MB
                            </span>
                          </div>
                          {stepInfo.details && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              {stepInfo.details}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Dots */}
                      <div className="flex items-center space-x-2 ml-9">
                        {Array.from({ length: stepInfo.total }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              stepInfo.step === -1
                                ? "bg-red-200"
                                : i < stepInfo.step
                                ? "bg-blue-600"
                                : i === stepInfo.step
                                ? "bg-blue-400"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Additional Info */}
                      {item.trim && (
                        <div className="text-xs text-blue-600 ml-9">
                          Trimmed ({item.trim.startSec}s - {item.trim.endSec}s)
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
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
