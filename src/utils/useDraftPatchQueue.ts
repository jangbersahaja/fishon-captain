import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Patch items store a shallow partial of the sanitized draft state plus metadata.
 */
export interface DraftPatch<T extends Record<string, unknown>> {
  id: string;
  at: string; // ISO timestamp
  data: Partial<T>;
}

interface UseDraftPatchQueueOptions {
  draftId: string | null;
  storageNamespace?: string; // override for testing
}

function storageKeyFor(draftId: string, ns: string) {
  return `${ns}.${draftId}`;
}

/**
 * Manage a per-draft offline patch queue persisted in localStorage.
 * Queue only activates once a server draft id exists.
 */
export function useDraftPatchQueue<T extends Record<string, unknown>>({
  draftId,
  storageNamespace = "fishon.charterDraft.patchQueue",
}: UseDraftPatchQueueOptions) {
  const [queue, setQueue] = useState<DraftPatch<T>[]>([]);
  const keyRef = useRef<string | null>(null);

  // Load when draftId changes
  useEffect(() => {
    if (!draftId || typeof window === "undefined") {
      setQueue([]);
      keyRef.current = null;
      return;
    }
    const k = storageKeyFor(draftId, storageNamespace);
    keyRef.current = k;
    try {
      const raw = window.localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftPatch<T>[];
        if (Array.isArray(parsed)) setQueue(parsed);
      }
    } catch {
      /* ignore */
    }
  }, [draftId, storageNamespace]);

  // Persist when queue changes
  useEffect(() => {
    if (!keyRef.current || typeof window === "undefined") return;
    try {
      if (queue.length === 0) window.localStorage.removeItem(keyRef.current);
      else window.localStorage.setItem(keyRef.current, JSON.stringify(queue));
    } catch {
      /* ignore */
    }
  }, [queue]);

  const enqueue = useCallback(
    (data: Partial<T>) => {
      if (!draftId) return;
      const patch: DraftPatch<T> = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        data,
      };
      setQueue((q) => [...q, patch]);
    },
    [draftId]
  );

  const clear = useCallback(() => setQueue([]), []);

  /** Merge all patches (last write wins per top-level key) without clearing */
  const merged = useCallback((): Partial<T> => {
    const acc: Record<string, unknown> = {};
    for (const p of queue) Object.assign(acc, p.data);
    return acc as Partial<T>;
  }, [queue]);

  /** Drain the queue (returns merged + clears). */
  const drainMerged = useCallback((): Partial<T> => {
    const m = merged();
    setQueue([]);
    return m;
  }, [merged]);

  return {
    queue,
    length: queue.length,
    enqueue,
    clear,
    merged,
    drainMerged,
  };
}
