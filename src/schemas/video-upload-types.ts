/**
 * Centralized video upload domain types
 * These types model the lifecycle of a short-form video upload within the new queue system.
 */

export type VideoUploadStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "done"
  | "error"
  | "canceled";

export type QueuePriority = "low" | "normal" | "high" | "urgent";

export interface QueueAnalytics {
  totalItems: number;
  activeUploads: number;
  completedUploads: number;
  failedUploads: number;
  averageUploadTime: number;
  totalBytesUploaded: number;
  queueWaitTime: number;
}

// Common metadata shared across all lifecycle states.
interface BaseVideoUploadItem {
  id: string;
  file: File; // Original file reference (kept for retries or trimming later)
  sizeBytes: number;
  createdAt: number; // epoch ms
  progress: number; // 0..1 user-facing progress (upload portion only for now)
  priority: QueuePriority;
  queuePosition?: number;
  // Placeholder for future trimming / fallback metadata (populated pre-upload in later phases)
  trim?: {
    startSec: number;
    endSec: number;
    // Added: metadata captured at trim time for bypass & analytics
    width?: number; // source width
    height?: number; // source height
    originalDurationSec?: number; // full source duration before trimming
    didFallback?: boolean;
    fallbackReason?: string | null;
  };
}

export interface PendingUploadItem extends BaseVideoUploadItem {
  status: "pending";
  progress: 0; // always 0 until XHR begins
}

export interface UploadingUploadItem extends BaseVideoUploadItem {
  status: "uploading";
  startedAt: number; // epoch ms
  progress: number; // 0..1 upload progress
  progressDetails?: ProgressDetails;
}

export interface ProcessingUploadItem extends BaseVideoUploadItem {
  status: "processing";
  startedAt: number;
  uploadedAt: number;
  progress: number; // 0.85..1 during processing stages
  blobKey: string;
  videoUrl: string; // temporary blob URL
  progressDetails?: ProgressDetails;
}

export interface DoneUploadItem extends BaseVideoUploadItem {
  status: "done";
  startedAt: number;
  uploadedAt: number;
  completedAt: number; // finish persisted
  progress: 1;
  blobKey: string;
  videoUrl: string;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: "network" | "server" | "client" | "validation";
  recoverable: boolean;
  retryAfter?: number; // seconds
  details?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterEnabled: boolean;
}

export interface ProgressDetails {
  phase: "uploading" | "processing" | "finalizing";
  bytesUploaded: number;
  totalBytes: number;
  transferSpeed?: number; // bytes per second
  estimatedTimeRemaining?: number; // seconds
  chunkProgress?: {
    completed: number;
    total: number;
  };
}

export interface ErrorUploadItem extends BaseVideoUploadItem {
  status: "error";
  progress: number; // may be partial
  startedAt?: number;
  uploadedAt?: number;
  blobKey?: string;
  videoUrl?: string;
  error: string;
  errorDetails?: ErrorDetails;
  retryCount?: number;
  lastRetryAt?: number;
}

export interface CanceledUploadItem extends BaseVideoUploadItem {
  status: "canceled";
  progress: number; // snapshot of progress at cancel time (0 if pending)
  startedAt?: number;
  canceledAt: number;
}

export type VideoUploadItem =
  | PendingUploadItem
  | UploadingUploadItem
  | ProcessingUploadItem
  | DoneUploadItem
  | ErrorUploadItem
  | CanceledUploadItem;

// Queue configuration
export interface VideoQueueConfig {
  maxConcurrent: number;
  captureThumbnail: boolean;
  autoStart: boolean;
  maxQueueSize: number;
  cleanupPolicy: {
    maxCompletedItems: number;
    maxFailedItems: number;
    autoCleanupAfterMs: number;
  };
  priorityWeights: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
  analytics: {
    enabled: boolean;
    sampleRate: number; // 0-1, percentage of operations to track
  };
  retryPolicy?: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
  };
  progressTracking?: {
    enableSpeedCalculation: boolean;
    speedSampleWindowMs: number;
    enableTimeEstimation: boolean;
  };
}

export const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterEnabled: true,
};

export const defaultVideoQueueConfig: VideoQueueConfig = {
  maxConcurrent: 2,
  captureThumbnail: true,
  autoStart: false,
  maxQueueSize: 20,
  cleanupPolicy: {
    maxCompletedItems: 5,
    maxFailedItems: 3,
    autoCleanupAfterMs: 5 * 60 * 1000, // 5 minutes
  },
  priorityWeights: {
    urgent: 1000,
    high: 100,
    normal: 10,
    low: 1,
  },
  analytics: {
    enabled: true,
    sampleRate: 0.1, // Track 10% of operations
  },
  retryPolicy: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
  },
  progressTracking: {
    enableSpeedCalculation: true,
    speedSampleWindowMs: 5000,
    enableTimeEstimation: true,
  },
};

// Narrowing helpers (optional ergonomics for consumers)
export const isActiveUpload = (i: VideoUploadItem) =>
  i.status === "uploading" || i.status === "processing";
export const isTerminalUpload = (i: VideoUploadItem) =>
  i.status === "done" || i.status === "error" || i.status === "canceled";
