"use client";
import {
  PENDING_POLL_BACKOFF_FACTOR,
  PENDING_POLL_INTERVAL_MS,
} from "@/config/mediaProcessing";
import { isFormDebug } from "@features/charter-onboarding/debug";
import { useCallback, useEffect, useRef, useState } from "react";

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
  stopWhenAllReady = true,
}: UsePendingMediaPollOptions) {
  const [items, setItems] = useState<PendingMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const activeRef = useRef(true);
  const itemsRef = useRef<PendingMediaItem[]>([]);
  const idsRef = useRef<string[]>(ids);
  const enabledRef = useRef<boolean>(enabled);
  // Extra polling attempts to wait for thumbnails after READY
  const thumbExtraAttemptsRef = useRef(0);
  const MAX_THUMB_EXTRA_ATTEMPTS = 5; // ~5 * backoff windows

  // Keep refs in sync
  const idsKey = ids.join("|");
  useEffect(() => {
    idsRef.current = ids;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- idsKey captures structural change; raw ids ref updates handled here
  }, [idsKey]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Stable fetch function (does not change identity) to avoid effect churn.
  const fetchStatuses = useCallback(async () => {
    const currentIds = idsRef.current;
    if (!enabledRef.current || !currentIds.length) return;
    const debug =
      isFormDebug() || process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1";
    if (debug) {
      console.log("[pendingPoll] fetch_start", {
        ids: currentIds,
        attempt: attemptRef.current,
      });
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      // compress into a single ids param for brevity
      qs.set("ids", currentIds.join(","));
      const res = await fetch(`/api/media/pending?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`poll_failed_${res.status}`);
      const json = await res.json();
      if (json.ok) {
        const next: PendingMediaItem[] = json.items || [];
        itemsRef.current = next;
        setItems(next);
        setError(null);
        attemptRef.current = 0; // reset backoff on success
        if (debug) {
          console.log("[pendingPoll] fetch_success", {
            count: next.length,
            statuses: next.map((i) => `${i.id}:${i.status}`),
          });
          const failed = next.filter((i) => i.status === "FAILED");
          if (failed.length) {
            failed.forEach((f) => {
              console.warn("[pendingPoll] item_failed", {
                id: f.id,
                error: f.error,
                kind: f.kind,
              });
            });
          }
        }
      } else {
        throw new Error(json.error || "poll_failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "poll_error");
      attemptRef.current += 1;
      if (isFormDebug() || process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        console.warn("[pendingPoll] fetch_error", {
          message: e instanceof Error ? e.message : String(e),
          attempt: attemptRef.current,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Derived booleans
  const allReady = items.length > 0 && items.every((i) => i.status === "READY");
  const anyFailed = items.some((i) => i.status === "FAILED");

  // idsKey declared earlier now
  // Polling effect: only restart when ids set, enabled, or stop policy changes.
  // We intentionally exclude derived booleans (allReady/anyFailed) from deps to avoid
  // re-running the whole effect every state change which caused infinite loops.
  useEffect(() => {
    activeRef.current = true;
    attemptRef.current = 0;
    itemsRef.current = [];
    setItems([]);
    setError(null);
    if (!enabled || ids.length === 0) return;

    const debug =
      isFormDebug() || process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1";
    const tick = async () => {
      if (!activeRef.current) return;
      await fetchStatuses();
      if (!activeRef.current) return;
      const current = itemsRef.current;
      const allReadyLocal =
        current.length > 0 && current.every((i) => i.status === "READY");
      const anyFailedLocal = current.some((i) => i.status === "FAILED");
      const anyReadyMissingThumb = current.some(
        (i) => i.status === "READY" && i.kind === "VIDEO" && !i.thumbnailUrl
      );
      if (debug) {
        console.log("[pendingPoll] tick_result", {
          ids: idsRef.current,
          allReadyLocal,
          anyFailedLocal,
          nextAttempt: attemptRef.current,
        });
      }
      if (stopWhenAllReady && ids.length && allReadyLocal) {
        if (
          anyReadyMissingThumb &&
          thumbExtraAttemptsRef.current < MAX_THUMB_EXTRA_ATTEMPTS
        ) {
          thumbExtraAttemptsRef.current += 1;
          if (debug)
            console.log("[pendingPoll] extra_thumb_attempt", {
              attempt: thumbExtraAttemptsRef.current,
            });
        } else {
          if (debug) console.log("[pendingPoll] stop_all_ready");
          return; // stop polling
        }
      }
      if (anyFailedLocal) {
        if (debug) console.log("[pendingPoll] stop_failure");
        return; // stop on failure
      }
      const base = PENDING_POLL_INTERVAL_MS;
      const attempt = attemptRef.current;
      const delay = Math.min(
        base * Math.pow(PENDING_POLL_BACKOFF_FACTOR, attempt),
        30_000
      );
      if (debug) {
        console.log("[pendingPoll] schedule_next", { delay, attempt });
      }
      timerRef.current = window.setTimeout(tick, delay);
    };
    tick();
    return () => {
      activeRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchStatuses stable; we restart on ids/enabled/stopWhenAllReady only
  }, [idsKey, enabled, stopWhenAllReady, ids.length]);

  return { items, loading, error, allReady, anyFailed, refetch: fetchStatuses };
}
