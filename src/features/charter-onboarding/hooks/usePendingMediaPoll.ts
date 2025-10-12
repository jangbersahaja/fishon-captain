"use client";
import { useCallback, useState } from "react";

export interface PendingMediaItem {
  id: string;
  status: "QUEUED" | "TRANSCODING" | "READY" | "FAILED";
  kind: "IMAGE" | "VIDEO";
  finalKey?: string | null;
  finalUrl?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  error?: string | null;
  charterMediaId?: string | null;
  charterId?: string | null;
}

interface UsePendingMediaPollOptions {
  ids: string[];
  enabled?: boolean;
  stopWhenAllReady?: boolean; // default true
}

export function usePendingMediaPoll({
  ids,
  enabled = true,
}: UsePendingMediaPollOptions) {
  // Deprecated: PendingMedia polling removed. Return static no-op state.
  void ids;
  void enabled;
  const [items] = useState<PendingMediaItem[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const allReady = true;
  const anyFailed = false;
  const refetch = useCallback(async () => {
    return [] as PendingMediaItem[];
  }, []);
  return { items, loading, error, allReady, anyFailed, refetch };
}
