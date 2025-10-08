import { videoUploadQueue } from "@/lib/uploads/videoQueue";
import { QueuePriority, VideoUploadItem } from "@/types/videoUpload";
import { useEffect, useState } from "react";

export function useVideoQueue() {
  const [items, setItems] = useState<VideoUploadItem[]>([]);
  useEffect(() => {
    const unsubscribe = videoUploadQueue.subscribe(setItems);
    return () => unsubscribe();
  }, []);
  return {
    items,
    enqueue: (
      fileOrOpts:
        | File
        | {
            file: File;
            trim?: {
              startSec: number;
              endSec: number;
              width?: number;
              height?: number;
              originalDurationSec?: number;
              didFallback?: boolean;
              fallbackReason?: string | null;
            };
            priority?: QueuePriority;
          },
      priority?: QueuePriority
    ) => {
      if (fileOrOpts instanceof File) {
        return videoUploadQueue.enqueue(
          priority ? { file: fileOrOpts, priority } : fileOrOpts
        );
      } else {
        return videoUploadQueue.enqueue(fileOrOpts);
      }
    },
    cancel: (id: string) => videoUploadQueue.cancel(id),
    retry: (id: string) => videoUploadQueue.retry(id),
    pause: () => videoUploadQueue.pause(),
    resume: () => videoUploadQueue.resume(),
    setMaxConcurrent: (n: number) => videoUploadQueue.setMaxConcurrent(n),
    setAutoStart: (enabled: boolean) => videoUploadQueue.setAutoStart(enabled),
    startUpload: (id: string) => videoUploadQueue.startUpload(id),
    updatePendingTrim: (
      id: string,
      next: {
        file: File;
        trim: {
          startSec: number;
          endSec: number;
          width?: number;
          height?: number;
          originalDurationSec?: number;
          didFallback?: boolean;
          fallbackReason?: string | null;
        };
      }
    ) => videoUploadQueue.updatePendingTrim(id, next),
    remove: (id: string) => videoUploadQueue.remove(id),

    // Phase 10: Advanced Queue Management
    pauseAll: () => videoUploadQueue.pauseAll(),
    resumeAll: () => videoUploadQueue.resumeAll(),
    retryAllFailed: () => videoUploadQueue.retryAllFailed(),
    clearCompleted: () => videoUploadQueue.clearCompleted(),
    clearAll: () => videoUploadQueue.clearAll(),
    setPriority: (id: string, priority: QueuePriority) =>
      videoUploadQueue.setPriority(id, priority),
    getAnalytics: () => videoUploadQueue.getAnalytics(),
  };
}
