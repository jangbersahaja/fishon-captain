/**
 * Simple in-memory + sessionStorage backed offline operation queue.
 * Use to enqueue idempotent actions (e.g. save edits) while the user is offline.
 * On reconnect (or explicit retry), queued operations execute sequentially.
 */

export interface QueuedOperation {
  id: string;
  run: () => Promise<void> | void; // action must be idempotent / safe to retry
  description?: string;
  attempts: number;
  lastError?: string;
}

interface SerializedOp {
  id: string;
  description?: string;
  // We cannot serialize the function; we only persist metadata so caller can re-register.
}

class OfflineQueue {
  private ops: QueuedOperation[] = [];
  private running = false;
  private listeners: Set<() => void> = new Set();
  private storageKey = "offline_queue_meta";

  constructor() {
    if (typeof window !== "undefined") {
      // Attempt restore metadata (functions must be re-bound by caller if needed)
      try {
        const raw = sessionStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as SerializedOp[];
          // We only keep placeholders; caller may rehydrate by calling rebind
          this.ops = parsed.map((p) => ({
            id: p.id,
            description: p.description,
            run: async () => {
              throw new Error("Unbound offline op: " + p.id);
            },
            attempts: 0,
          }));
        }
      } catch {
        /* ignore */
      }
      window.addEventListener("online", () => {
        void this.flush();
      });
    }
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    this.listeners.forEach((l) => l());
    this.persistMeta();
  }

  private persistMeta() {
    if (typeof window === "undefined") return;
    try {
      const meta: SerializedOp[] = this.ops.map((o) => ({
        id: o.id,
        description: o.description,
      }));
      sessionStorage.setItem(this.storageKey, JSON.stringify(meta));
    } catch {
      /* ignore */
    }
  }

  enqueue(op: Omit<QueuedOperation, "attempts">) {
    const exists = this.ops.find((o) => o.id === op.id);
    if (exists) return; // don't duplicate
    this.ops.push({ ...op, attempts: 0 });
    this.emit();
  }

  /** Replace the run function for a placeholder restored from session. */
  rebind(id: string, run: () => Promise<void> | void) {
    const op = this.ops.find((o) => o.id === id);
    if (op) {
      op.run = run;
      this.emit();
    }
  }

  list() {
    return [...this.ops];
  }

  clear() {
    this.ops = [];
    this.emit();
  }

  async flush() {
    if (this.running) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    this.running = true;
    try {
      for (const op of [...this.ops]) {
        try {
          await op.run();
          this.ops = this.ops.filter((o) => o.id !== op.id);
          this.emit();
        } catch (e) {
          op.attempts += 1;
          op.lastError = e instanceof Error ? e.message : String(e);
          // Leave in queue; bail early to avoid hammering.
          break;
        }
      }
    } finally {
      this.running = false;
    }
  }
}

export const offlineQueue = new OfflineQueue();
