import { counter } from "@/lib/metrics";
import { queueStorage } from "@/lib/storage/queueStorage";
import {
  CanceledUploadItem,
  defaultVideoQueueConfig,
  DoneUploadItem,
  ErrorDetails,
  ErrorUploadItem,
  PendingUploadItem,
  ProcessingUploadItem,
  ProgressDetails,
  QueueAnalytics,
  QueuePriority,
  UploadingUploadItem,
  VideoQueueConfig,
  VideoUploadItem,
} from "@/types/videoUpload";
import { captureThumbnailFromSrc } from "@/utils/captureThumbnail";

export type VideoQueueListener = (items: VideoUploadItem[]) => void;

// Debug flag (browser + build-time env). Can also be toggled at runtime via window.__VIDEO_QUEUE_DEBUG__ = true
const VIDEO_QUEUE_DEBUG = () => {
  try {
    if (typeof window === "undefined") return false;
    // Allow dynamic runtime toggle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = (window as any).__VIDEO_QUEUE_DEBUG__;
    if (runtime !== undefined) return !!runtime;
  } catch {
    /* ignore */
  }
  if (typeof process !== "undefined") {
    return (
      process.env.NEXT_PUBLIC_VIDEO_QUEUE_DEBUG === "true" ||
      process.env.NEXT_PUBLIC_VIDEO_QUEUE_DEBUG === "1"
    );
  }
  return false;
};

const dbg = (...args: unknown[]) => {
  if (VIDEO_QUEUE_DEBUG()) {
    console.log("[video-queue]", ...args);
  }
};

class VideoUploadQueue {
  private items: VideoUploadItem[] = [];
  private listeners: Set<VideoQueueListener> = new Set();
  private activeCount = 0;
  private readonly config: VideoQueueConfig;
  // Track in-flight XHR objects for real cancellation support
  private xhrMap: Map<string, XMLHttpRequest> = new Map();
  private paused = false;

  // Phase 7: Enhanced error handling
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  // Phase 8: Progress tracking enhancement
  private progressTrackers: Map<
    string,
    {
      startTime: number;
      lastUpdate: number;
      bytesAtLastUpdate: number;
      speedSamples: Array<{ timestamp: number; bytes: number }>;
    }
  > = new Map();

  // Phase 10: Advanced Queue Management
  private analytics: QueueAnalytics = {
    totalItems: 0,
    activeUploads: 0,
    completedUploads: 0,
    failedUploads: 0,
    averageUploadTime: 0,
    totalBytesUploaded: 0,
    queueWaitTime: 0,
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(cfg?: Partial<VideoQueueConfig>) {
    this.config = { ...defaultVideoQueueConfig, ...(cfg || {}) };
    if (typeof window !== "undefined") {
      this.hydrateFromStorage();
      // Phase 10: Start cleanup timer
      this.startCleanupTimer();
      // Deferred kick to allow user controls to attach first
      setTimeout(() => {
        if (this.config.autoStart) this.kick();
      }, 0);
    }
    dbg("constructed", {
      autoStart: this.config.autoStart,
      maxConcurrent: this.config.maxConcurrent,
    });
  }

  subscribe(fn: VideoQueueListener) {
    this.listeners.add(fn);
    fn(this.items);
    return () => {
      this.listeners.delete(fn);
    };
  }

  enqueue(
    fileOrOpts:
      | File
      | {
          file: File;
          trim?: PendingUploadItem["trim"];
          priority?: QueuePriority;
        }
  ): VideoUploadItem {
    let file: File;
    let trim: PendingUploadItem["trim"] | undefined;
    let priority: QueuePriority = "normal"; // Default priority

    if (fileOrOpts instanceof File) {
      file = fileOrOpts;
    } else {
      file = fileOrOpts.file;
      trim = fileOrOpts.trim;
      priority = fileOrOpts.priority || "normal";
    }

    // Phase 10: Check queue size limits
    if (this.items.length >= this.config.maxQueueSize) {
      console.warn(
        `Queue size limit reached (${this.config.maxQueueSize}). Auto-cleanup initiated.`
      );
      this.autoCleanup();

      // If still at limit after cleanup, reject oldest non-active items
      if (this.items.length >= this.config.maxQueueSize) {
        this.removeOldestInactiveItems(1);
      }
    }

    const item: PendingUploadItem = {
      id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file,
      status: "pending",
      progress: 0,
      sizeBytes: file.size,
      createdAt: Date.now(),
      priority,
      ...(trim ? { trim } : {}),
    };

    // Phase 10: Insert based on priority
    this.insertByPriority(item);
    dbg("enqueue", {
      id: item.id,
      name: file.name,
      priority: item.priority,
      size: file.size,
      queueLength: this.items.length + 1,
    });
    this.updateQueuePositions();
    this.emit();
    if (this.config.autoStart) this.kick();
    counter("video_queue_enqueue").inc();
    return item;
  }

  setAutoStart(enabled: boolean) {
    if (this.config.autoStart !== enabled) {
      (this.config as { autoStart: boolean }).autoStart = enabled;
      counter("video_queue_set_autostart").inc();
      if (enabled) this.kick();
    }
  }

  startUpload(id: string) {
    const item = this.items.find((i) => i.id === id);
    if (item && item.status === "pending") this.start(item);
  }

  updatePendingTrim(
    id: string,
    next: { file: File; trim: PendingUploadItem["trim"] }
  ): boolean {
    let updated = false;
    this.items = this.items.map((i) => {
      if (i.id === id && i.status === "pending") {
        updated = true;
        return {
          ...i,
          file: next.file,
          sizeBytes: next.file.size,
          trim: next.trim,
        } as PendingUploadItem;
      }
      return i;
    });
    if (updated) this.emit();
    return updated;
  }

  cancel(id: string) {
    let mutated = false;
    this.items = this.items.map((i) => {
      if (i.id !== id) return i;
      if (i.status === "pending") {
        mutated = true;
        const canceled: CanceledUploadItem = {
          ...i,
          status: "canceled",
          progress: 0,
          canceledAt: Date.now(),
        };
        return canceled;
      }
      if (i.status === "uploading") {
        // NOTE: We cannot abort the in-flight XHR yet (Phase for real cancellation later)
        mutated = true;
        // Abort the underlying XHR if present
        const xhr = this.xhrMap.get(i.id);
        if (xhr) {
          try {
            xhr.abort();
          } catch {
            /* ignore */
          }
          this.xhrMap.delete(i.id);
        }
        const canceled: CanceledUploadItem = {
          ...i,
          status: "canceled",
          progress: i.progress,
          canceledAt: Date.now(),
        };
        return canceled;
      }
      return i;
    });
    if (mutated) {
      counter("video_queue_canceled").inc();
      this.emit();
    }
  }

  retry(id: string) {
    let target: VideoUploadItem | undefined;
    this.items = this.items.map((i) => {
      if (i.id !== id) return i;
      if (i.status === "error" || i.status === "canceled") {
        const pending: PendingUploadItem = {
          id: i.id,
          // keep original file
          file: i.file,
          status: "pending",
          progress: 0,
          sizeBytes: i.sizeBytes,
          createdAt: i.createdAt,
          priority: i.priority || "normal", // Preserve existing priority or default
          trim: (i as { trim?: PendingUploadItem["trim"] }).trim,
        };
        target = pending;
        return pending;
      }
      return i;
    });
    if (target) {
      counter("video_queue_retry").inc();
      this.emit();
      this.kick();
    }
  }

  pause() {
    if (!this.paused) {
      this.paused = true;
      counter("video_queue_paused").inc();
    }
  }

  resume() {
    if (this.paused) {
      this.paused = false;
      counter("video_queue_resumed").inc();
      this.kick();
    }
  }

  setMaxConcurrent(n: number) {
    if (n < 1) n = 1;
    if (n !== this.config.maxConcurrent) {
      (this.config as { maxConcurrent: number }).maxConcurrent = n;
      counter("video_queue_set_concurrency").inc();
      this.kick();
    }
  }

  private emit() {
    const snapshot = [...this.items];
    this.listeners.forEach((l) => l(snapshot));
    // Persist state changes (debounced)
    this.debouncedPersist();
  }

  private persistTimer: NodeJS.Timeout | null = null;
  private debouncedPersist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), 500);
  }

  private async cleanupStoredItem(id: string) {
    try {
      await queueStorage.removeItem(id);
    } catch (e) {
      console.warn("queue.cleanup.failed", id, e);
    }
  }

  private kick() {
    // Maintain up to maxConcurrent active (uploading|processing)
    if (this.paused) return;
    const pendingCount = this.items.filter(
      (i) => i.status === "pending"
    ).length;
    dbg("kick", {
      active: this.activeCount,
      max: this.config.maxConcurrent,
      pending: pendingCount,
    });
    while (
      this.activeCount < this.config.maxConcurrent &&
      this.items.some((i) => i.status === "pending")
    ) {
      const next = this.items.find((i) => i.status === "pending");
      if (!next) break;
      this.start(next);
    }
  }

  private async start(item: VideoUploadItem) {
    if (item.status !== "pending") return;
    dbg("start", { id: item.id, name: item.file.name, size: item.file.size });

    // Phase 8: Initialize progress tracking
    this.initializeProgressTracker(item.id);

    // Transition to uploading (immutable style for React friendliness)
    const started: UploadingUploadItem = {
      ...item,
      status: "uploading",
      startedAt: Date.now(),
      progress: 0,
    };
    this.replaceItem(started);
    this.activeCount++;

    try {
      const createRes = await fetch("/api/blob/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: started.file.name,
          fileType: started.file.type || "video/mp4",
        }),
      });
      if (!createRes.ok) throw new Error("init failed");
      const { uploadUrl, blobKey } = await createRes.json();
      const formData = new FormData();
      formData.append("file", started.file);
      formData.append("shortVideo", "true");

      const xhr = new XMLHttpRequest();
      this.xhrMap.set(started.id, xhr);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const progress = ev.loaded / ev.total;
          // Phase 8: Enhanced progress tracking with detailed information
          const progressDetails = this.updateProgressDetails(
            started.id,
            ev.loaded,
            ev.total,
            "uploading"
          );
          if (VIDEO_QUEUE_DEBUG()) {
            const pct = (progress * 100).toFixed(1);
            dbg("progress", {
              id: started.id,
              pct,
              bytes: ev.loaded,
              total: ev.total,
            });
          }

          // mutate through replace to keep immutable pattern
          const current = this.items.find((i) => i.id === started.id);
          if (current && current.status === "uploading") {
            const updating: UploadingUploadItem = {
              ...current,
              progress,
              progressDetails,
            };
            this.replaceItem(updating);
          }
        }
      };

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const json = JSON.parse(xhr.responseText) as { url: string };
                // Phase 8: Update progress for successful upload completion
                this.updateProgressDetails(
                  started.id,
                  started.file.size,
                  started.file.size,
                  "finalizing"
                );
                resolve(json.url);
              } catch (e) {
                reject(e);
              }
            } else {
              // Phase 7: Enhanced error handling for HTTP errors
              const error = new Error(
                `Upload failed with status ${xhr.status}: ${xhr.statusText}`
              );
              reject(error);
            }
          }
        };
        xhr.onerror = () => {
          // Phase 7: Enhanced error handling for network errors
          const error = new Error("Network error during upload");
          reject(error);
        };
      });
      xhr.open("POST", uploadUrl);
      xhr.send(formData);
      const videoUrl = await uploadPromise;
      // If canceled mid-flight, skip transitioning further
      const postUploadCurrent = this.items.find((i) => i.id === started.id);
      if (!postUploadCurrent || postUploadCurrent.status === "canceled") {
        this.xhrMap.delete(started.id);
        return;
      }
      const processing: ProcessingUploadItem = {
        ...started,
        status: "processing",
        progress: 1,
        uploadedAt: Date.now(),
        blobKey,
        videoUrl,
      };
      this.replaceItem(processing);
      dbg("uploaded", { id: started.id, blobKey, url: videoUrl });
      this.xhrMap.delete(started.id);
      counter("video_queue_uploaded").inc();

      // Immediately finalize (could batch later)
      const form = new FormData();
      form.append("videoUrl", processing.videoUrl);
      const startSec = processing.trim ? processing.trim.startSec : 0;
      const duration =
        processing.trim && processing.trim.endSec > processing.trim.startSec
          ? processing.trim.endSec - processing.trim.startSec
          : 0;
      form.append("startSec", String(startSec));
      form.append("duration", String(duration));
      form.append("ownerId", "self"); // placeholder until actual owner context provided
      form.append("blobKey", processing.blobKey);
      if (processing.trim) {
        if (typeof processing.trim.endSec === "number") {
          form.append("endSec", String(processing.trim.endSec));
        }
        if (typeof processing.trim.width === "number") {
          form.append("width", String(processing.trim.width));
        }
        if (typeof processing.trim.height === "number") {
          form.append("height", String(processing.trim.height));
        }
        if (typeof processing.trim.originalDurationSec === "number") {
          form.append(
            "originalDurationSec",
            String(processing.trim.originalDurationSec)
          );
        }
      }
      if (processing.trim?.didFallback !== undefined) {
        form.append("didFallback", String(!!processing.trim.didFallback));
        if (processing.trim.fallbackReason) {
          form.append(
            "fallbackReason",
            processing.trim.fallbackReason.slice(0, 300)
          );
        }
      }
      if (this.config.captureThumbnail) {
        try {
          const thumb = await captureThumbnailFromSrc(processing.videoUrl);
          form.append("thumbnail", thumb, "thumb.jpg");
        } catch (e) {
          console.warn("queue.thumbnail.capture_failed", e);
        }
      }
      const finishRes = await fetch("/api/blob/finish", {
        method: "POST",
        body: form,
      });
      if (!finishRes.ok) throw new Error("finish failed");
      const done: DoneUploadItem = {
        ...processing,
        status: "done",
        completedAt: Date.now(),
      };
      this.replaceItem(done);
      dbg("done", { id: done.id, totalMs: done.completedAt - done.startedAt });
      counter("video_queue_done").inc();
      // Phase 8: Cleanup progress tracking for completed uploads
      this.cleanupProgressTracker(done.id);
      // Remove completed item from persistent storage
      this.cleanupStoredItem(done.id);
      // Auto-remove done item shortly to free queue UI
      setTimeout(() => {
        const still = this.items.find(
          (i) => i.id === done.id && i.status === "done"
        );
        if (still) {
          this.removeItem(done.id);
          this.emit();
        }
      }, 600);
    } catch (e) {
      dbg("error", {
        id: item.id,
        message: e instanceof Error ? e.message : String(e),
      });
      // Phase 7: Enhanced error handling with categorization and retry logic
      const current = this.items.find((i) => i.id === item.id);
      if (current && current.status !== "canceled") {
        const errorDetails = this.categorizeError(e, "upload");
        const currentRetries =
          current.status === "error" ? current.retryCount || 0 : 0;
        const maxRetries = this.config.retryPolicy?.maxAttempts || 3;

        // Only retry for recoverable errors and within retry limits
        if (currentRetries < maxRetries && errorDetails.recoverable) {
          const retryingItem: ErrorUploadItem = {
            ...current,
            progress: current.progress,
            status: "error",
            error: errorDetails.message,
            errorDetails,
            retryCount: currentRetries + 1,
            lastRetryAt: Date.now(),
          } as ErrorUploadItem;
          this.replaceItem(retryingItem);
          this.scheduleRetry(retryingItem);
        } else {
          // Max retries reached or unrecoverable error
          const errorItem: ErrorUploadItem = {
            ...current,
            progress: current.progress,
            status: "error",
            error: errorDetails.message,
            errorDetails,
            retryCount: currentRetries,
          } as ErrorUploadItem;
          this.replaceItem(errorItem);
        }
      }
      counter("video_queue_error").inc();
    } finally {
      // Phase 8: Cleanup progress tracking
      this.cleanupProgressTracker(item.id);
      this.xhrMap.delete(item.id);
      this.activeCount = Math.max(0, this.activeCount - 1);
      // trigger more if capacity
      setTimeout(() => this.kick(), 25);
    }
  }

  private replaceItem(next: VideoUploadItem) {
    const prev = this.items.find((i) => i.id === next.id);
    this.items = this.items.map((i) => (i.id === next.id ? next : i));
    if (prev && prev.status !== next.status) {
      dbg("transition", {
        id: next.id,
        from: prev.status,
        to: next.status,
        progress: next.progress,
      });
    }
    this.emit();
  }

  // Public remove method so UI can manually clear items (e.g., after completion)
  remove(id: string) {
    this.removeItem(id);
    this.emit();
  }

  // --- Phase 7: Enhanced Error Handling ---

  private categorizeError(error: unknown, context: string): ErrorDetails {
    const message = error instanceof Error ? error.message : String(error);

    // Network errors
    if (
      message.includes("NetworkError") ||
      message.includes("Failed to fetch")
    ) {
      return {
        code: "NETWORK_ERROR",
        message:
          "Network connection failed. Please check your internet connection.",
        category: "network",
        recoverable: true,
        retryAfter: 5,
      };
    }

    // Server errors (5xx)
    if (
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503")
    ) {
      return {
        code: "SERVER_ERROR",
        message: "Server is temporarily unavailable. Please try again.",
        category: "server",
        recoverable: true,
        retryAfter: 10,
      };
    }

    // Client errors (4xx)
    if (
      message.includes("400") ||
      message.includes("413") ||
      message.includes("415")
    ) {
      return {
        code: "CLIENT_ERROR",
        message:
          "Invalid file or request. Please check your file and try again.",
        category: "client",
        recoverable: false,
      };
    }

    // File validation errors
    if (message.includes("size") || message.includes("format")) {
      return {
        code: "VALIDATION_ERROR",
        message:
          "File does not meet requirements. Please check file size and format.",
        category: "validation",
        recoverable: false,
      };
    }

    // Default fallback
    return {
      code: "UNKNOWN_ERROR",
      message: message || "An unexpected error occurred.",
      category: "client",
      recoverable: true,
      retryAfter: 5,
      details: { context, originalError: message },
    };
  }

  private calculateRetryDelay(retryCount: number): number {
    const policy = this.config.retryPolicy!;
    let delay =
      policy.baseDelayMs * Math.pow(policy.backoffMultiplier, retryCount);
    delay = Math.min(delay, policy.maxDelayMs);

    if (policy.jitterEnabled) {
      // Add ±25% jitter to prevent thundering herd
      const jitter = delay * 0.25 * (Math.random() - 0.5);
      delay += jitter;
    }

    return Math.max(delay, 0);
  }

  private scheduleRetry(item: ErrorUploadItem): void {
    const retryCount = (item.retryCount || 0) + 1;
    const maxAttempts = this.config.retryPolicy?.maxAttempts || 3;

    if (retryCount >= maxAttempts || !item.errorDetails?.recoverable) {
      // Mark as permanently failed
      const finalError: ErrorUploadItem = {
        ...item,
        retryCount,
        error: `Failed after ${retryCount} attempts: ${item.error}`,
      };
      this.replaceItem(finalError);
      counter("video_queue_max_retries").inc();
      return;
    }

    const delay = this.calculateRetryDelay(retryCount - 1);
    const retryAt = Date.now() + delay;
    dbg("scheduleRetry", { id: item.id, attempt: retryCount, inMs: delay });

    // Clear any existing retry timeout
    const existingTimeout = this.retryTimeouts.get(item.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule the retry
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(item.id);

      // Convert back to pending for retry
      const retryItem: PendingUploadItem = {
        id: item.id,
        file: item.file,
        sizeBytes: item.sizeBytes,
        createdAt: item.createdAt,
        progress: 0,
        status: "pending",
        priority: item.priority || "normal", // Preserve existing priority
        trim: item.trim,
      };

      this.replaceItem(retryItem);
      counter("video_queue_retry").inc();
      this.kick(); // Try to start immediately
    }, delay);

    this.retryTimeouts.set(item.id, timeout);

    // Update item with retry info
    const retryingItem: ErrorUploadItem = {
      ...item,
      retryCount,
      lastRetryAt: retryAt,
    };
    this.replaceItem(retryingItem);
  }

  // --- Phase 8: Enhanced Progress Tracking ---

  private initializeProgressTracker(itemId: string): void {
    if (!this.config.progressTracking?.enableSpeedCalculation) return;

    this.progressTrackers.set(itemId, {
      startTime: Date.now(),
      lastUpdate: Date.now(),
      bytesAtLastUpdate: 0,
      speedSamples: [],
    });
  }

  private updateProgressDetails(
    itemId: string,
    bytesUploaded: number,
    totalBytes: number,
    phase: "uploading" | "processing" | "finalizing" = "uploading"
  ): ProgressDetails | undefined {
    if (!this.config.progressTracking?.enableSpeedCalculation) return undefined;

    const tracker = this.progressTrackers.get(itemId);
    if (!tracker) return undefined;

    const now = Date.now();
    const timeDelta = now - tracker.lastUpdate;

    // Update speed samples (keep last N seconds of samples)
    const windowMs = this.config.progressTracking.speedSampleWindowMs || 5000;
    tracker.speedSamples.push({ timestamp: now, bytes: bytesUploaded });
    tracker.speedSamples = tracker.speedSamples.filter(
      (s) => now - s.timestamp <= windowMs
    );

    // Calculate transfer speed
    let transferSpeed: number | undefined;
    if (tracker.speedSamples.length >= 2 && timeDelta > 100) {
      const oldestSample = tracker.speedSamples[0];
      const newestSample =
        tracker.speedSamples[tracker.speedSamples.length - 1];
      const timeSpan = newestSample.timestamp - oldestSample.timestamp;
      const bytesSpan = newestSample.bytes - oldestSample.bytes;

      if (timeSpan > 0) {
        transferSpeed = (bytesSpan / timeSpan) * 1000; // bytes per second
      }
    }

    // Calculate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (
      transferSpeed &&
      transferSpeed > 0 &&
      this.config.progressTracking?.enableTimeEstimation
    ) {
      const remainingBytes = totalBytes - bytesUploaded;
      const progress = bytesUploaded / totalBytes;

      // Don't show time estimates when very close to completion
      // as they become unreliable and confusing
      if (progress < 0.95 && remainingBytes > 1024) {
        estimatedTimeRemaining = remainingBytes / transferSpeed;
      }
    }

    // Update tracker
    tracker.lastUpdate = now;
    tracker.bytesAtLastUpdate = bytesUploaded;

    return {
      phase,
      bytesUploaded,
      totalBytes,
      transferSpeed,
      estimatedTimeRemaining,
    };
  }

  private cleanupProgressTracker(itemId: string): void {
    this.progressTrackers.delete(itemId);
  }

  // --- Persistence (best-effort, browser only) ---
  private async persist() {
    if (typeof window === "undefined") return;
    try {
      // Store only non-terminal items
      const storableItems = this.items.filter(
        (i) => ["pending", "canceled"].includes(i.status) // do not persist failed items per new spec
      );

      // Store each item individually
      await Promise.all(
        storableItems.map((item) =>
          queueStorage.storeItem({
            id: item.id,
            file: item.file,
            status: item.status as "pending" | "canceled",
            progress: item.progress,
            sizeBytes: item.sizeBytes,
            createdAt: item.createdAt,
            startedAt: (item as UploadingUploadItem | ErrorUploadItem)
              .startedAt,
            canceledAt: (item as CanceledUploadItem).canceledAt,
            error: (item as ErrorUploadItem).error,
            trim: item.trim,
          })
        )
      );
    } catch (e) {
      console.warn("queue.persist.failed", e);
    }
  }

  private async hydrateFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const stored = await queueStorage.getStoredItems();
      if (!stored || stored.length === 0) return;

      // Convert stored items back to queue items
      const restored: VideoUploadItem[] = stored
        // filter out legacy 'error' entries gracefully
        .filter(
          (s: { status: string }) =>
            s.status === "pending" || s.status === "canceled"
        )
        .map(
          (item: {
            id: string;
            file: File;
            status: "pending" | "error" | "canceled"; // incoming may contain 'error' but filtered above
            progress: number;
            sizeBytes: number;
            createdAt: number;
            startedAt?: number;
            canceledAt?: number;
            error?: string;
            trim?: {
              startSec: number;
              endSec: number;
              didFallback?: boolean;
              fallbackReason?: string | null;
            };
          }) => {
            const base = {
              id: item.id,
              file: item.file,
              sizeBytes: item.sizeBytes,
              createdAt: item.createdAt,
              trim: item.trim,
              priority:
                (item as { priority?: QueuePriority }).priority || "normal", // Default priority for restored items
            };

            if (item.status === "pending") {
              return {
                ...base,
                status: "pending" as const,
                progress: 0, // Reset progress for pending items
              };
            } else {
              return {
                ...base,
                status: "canceled" as const,
                progress: item.progress,
                startedAt: item.startedAt,
                canceledAt: item.canceledAt || Date.now(),
              };
            }
          }
        );

      if (restored.length > 0) {
        this.items = [...restored, ...this.items];
        this.emit();
        counter("video_queue_restored").inc();
      }

      // Clean up old items (older than 7 days)
      await queueStorage.clearOldItems();
    } catch (e) {
      console.warn("queue.hydrate.failed", e);
    }
  }

  // --- Phase 10: Advanced Queue Management ---

  /**
   * Insert item into queue based on priority
   */
  private insertByPriority(item: PendingUploadItem): void {
    const priority = this.config.priorityWeights[item.priority];
    let insertIndex = this.items.length;

    // Find the correct position based on priority and creation time
    for (let i = 0; i < this.items.length; i++) {
      const existingItem = this.items[i];
      const existingPriority =
        this.config.priorityWeights[existingItem.priority];

      // Higher priority number = higher priority (insert earlier)
      if (
        priority > existingPriority ||
        (priority === existingPriority &&
          item.createdAt > existingItem.createdAt)
      ) {
        insertIndex = i;
        break;
      }
    }

    this.items.splice(insertIndex, 0, item);
  }

  /**
   * Update queue positions for all items
   */
  private updateQueuePositions(): void {
    this.items.forEach((item, index) => {
      if (item.status === "pending") {
        item.queuePosition = index + 1;
      }
    });
  }

  /**
   * Auto cleanup based on configured policies
   */
  private autoCleanup(): void {
    const { cleanupPolicy } = this.config;
    const now = Date.now();

    // Remove excess completed items
    const completedItems = this.items.filter((item) => item.status === "done");
    if (completedItems.length > cleanupPolicy.maxCompletedItems) {
      const toRemove = completedItems
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, completedItems.length - cleanupPolicy.maxCompletedItems);

      toRemove.forEach((item) => this.removeItem(item.id));
    }

    // Remove excess failed items
    const failedItems = this.items.filter((item) => item.status === "error");
    if (failedItems.length > cleanupPolicy.maxFailedItems) {
      const toRemove = failedItems
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, failedItems.length - cleanupPolicy.maxFailedItems);

      toRemove.forEach((item) => this.removeItem(item.id));
    }

    // Remove old items based on time policy
    const oldItems = this.items.filter(
      (item) =>
        (item.status === "done" ||
          item.status === "error" ||
          item.status === "canceled") &&
        now - item.createdAt > cleanupPolicy.autoCleanupAfterMs
    );

    oldItems.forEach((item) => this.removeItem(item.id));
  }

  /**
   * Remove oldest inactive items to make room
   */
  private removeOldestInactiveItems(count: number): void {
    const inactiveItems = this.items
      .filter(
        (item) => item.status !== "uploading" && item.status !== "processing"
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    const toRemove = inactiveItems.slice(0, count);
    toRemove.forEach((item) => this.removeItem(item.id));
  }

  /**
   * Remove item from queue
   */
  private removeItem(id: string): void {
    this.items = this.items.filter((item) => item.id !== id);
    this.cleanupStoredItem(id);
  }

  /**
   * Batch operations
   */
  pauseAll(): void {
    this.paused = true;
    this.items
      .filter((item) => item.status === "uploading")
      .forEach((item) => this.cancel(item.id));
  }

  resumeAll(): void {
    this.paused = false;
    this.kick();
  }

  retryAllFailed(): void {
    const failedItems = this.items.filter((item) => item.status === "error");
    failedItems.forEach((item) => this.retry(item.id));
  }

  clearCompleted(): void {
    const completedItems = this.items.filter(
      (item) =>
        item.status === "done" ||
        item.status === "error" ||
        item.status === "canceled"
    );
    completedItems.forEach((item) => this.removeItem(item.id));
    this.emit();
  }

  clearAll(): void {
    // Cancel active uploads first
    this.items
      .filter(
        (item) => item.status === "uploading" || item.status === "processing"
      )
      .forEach((item) => this.cancel(item.id));

    // Clear all items
    this.items = [];
    this.emit();
    dbg("clearAll");
  }

  /**
   * Set priority for existing item
   */
  setPriority(id: string, priority: QueuePriority): void {
    const item = this.items.find((i) => i.id === id);
    if (item && item.status === "pending") {
      item.priority = priority;
      // Re-sort queue
      this.items = this.items.filter((i) => i.id !== id);
      this.insertByPriority(item as PendingUploadItem);
      this.updateQueuePositions();
      this.emit();
      dbg("priority", { id, priority });
    }
  }

  /**
   * Get current queue analytics
   */
  getAnalytics(): QueueAnalytics {
    const totalItems = this.items.length;
    const activeUploads = this.items.filter(
      (i) => i.status === "uploading" || i.status === "processing"
    ).length;
    const completedUploads = this.items.filter(
      (i) => i.status === "done"
    ).length;
    const failedUploads = this.items.filter((i) => i.status === "error").length;

    // Calculate average upload time for completed items
    const completedItems = this.items.filter(
      (i) => i.status === "done" && "startedAt" in i && "completedAt" in i
    ) as DoneUploadItem[];

    const averageUploadTime =
      completedItems.length > 0
        ? completedItems.reduce(
            (sum, item) => sum + (item.completedAt - item.startedAt),
            0
          ) / completedItems.length
        : 0;

    // Calculate total bytes uploaded
    const totalBytesUploaded = this.items
      .filter((i) => i.status === "done")
      .reduce((sum, item) => sum + item.sizeBytes, 0);

    // Calculate average queue wait time for pending items
    const pendingItems = this.items.filter((i) => i.status === "pending");
    const queueWaitTime =
      pendingItems.length > 0
        ? pendingItems.reduce(
            (sum, item) => sum + (Date.now() - item.createdAt),
            0
          ) / pendingItems.length
        : 0;

    return {
      totalItems,
      activeUploads,
      completedUploads,
      failedUploads,
      averageUploadTime,
      totalBytesUploaded,
      queueWaitTime,
    };
  }

  /**
   * Start auto-cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Run cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.autoCleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop auto-cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /** Debug helper: dump current snapshot */
  debugDump() {
    return this.items.map((i) => ({
      id: i.id,
      status: i.status,
      progress: i.progress,
      priority: i.priority,
      queuePosition: (i as PendingUploadItem).queuePosition,
      size: i.sizeBytes,
    }));
  }
}

export { VideoUploadQueue };
// Export singleton instance with enhanced Phase 7, 8 & 10 configuration
export const videoUploadQueue = new VideoUploadQueue({
  // Phase 10: Advanced Queue Management
  maxQueueSize: 15,
  cleanupPolicy: {
    maxCompletedItems: 3,
    maxFailedItems: 2,
    autoCleanupAfterMs: 3 * 60 * 1000, // 3 minutes for faster cleanup
  },
  priorityWeights: {
    urgent: 1000,
    high: 100,
    normal: 10,
    low: 1,
  },
  analytics: {
    enabled: true,
    sampleRate: 0.2, // Track 20% of operations
  },
  // Phase 7 & 8: Enhanced error handling and progress tracking
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
  captureThumbnail: true,
});
