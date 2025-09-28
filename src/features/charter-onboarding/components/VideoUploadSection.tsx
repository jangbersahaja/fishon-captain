"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Extremely focused video upload section with detailed lifecycle logging.
// Responsibilities:
// 1. Select multiple videos
// 2. For each: local placeholder + quick first-frame thumbnail
// 3. Upload to /api/media/video (existing endpoint) -> PendingMedia (QUEUED)
// 4. Poll statuses (/api/media/pending?id=...) until READY or FAILED
// 5. Promote final URL (finalUrl replaces preview/original)
// 6. Expose blocking state (any queued/transcoding) to parent (save gating)
// 7. Allow remove (queued/transcoding: just client removal; ready: TODO server delete)
// 8. Rich console logging for every transition with stable prefix [videoFlow]
//
// NOTE: This is intentionally isolated from legacy/useCharterMediaManager. Parent can adopt this
// and eventually retire the old manager once photo logic is ported similarly.

export interface SimpleVideoItem {
  id: string; // pendingMediaId or temp id
  name: string; // original filename
  localObjectUrl?: string; // local blob URL for immediate preview
  previewUrl?: string; // server originalUrl (pre-transcode)
  finalUrl?: string; // final transcoded URL
  finalKey?: string; // storage key for finalized media (from pendingMedia.finalKey)
  thumbnailDataUrl?: string; // client-captured frame (fast placeholder)
  status: "local" | "queued" | "transcoding" | "ready" | "failed";
  error?: string;
  queuedAt?: number;
  transcodingAt?: number;
  readyAt?: number;
}

interface VideoUploadSectionProps {
  charterId?: string | null; // optional; can be null for orphans
  max?: number;
  onBlockingChange?: (blocking: boolean) => void; // emits true if any queued/transcoding
  onItemsChange?: (items: SimpleVideoItem[]) => void; // upstream persistence hook
}

export function VideoUploadSection({
  charterId = null,
  max = 5,
  onBlockingChange,
  onItemsChange,
}: VideoUploadSectionProps) {
  const [items, setItems] = useState<SimpleVideoItem[]>([]);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const destroyed = useRef(false);

  const log = useCallback((phase: string, extra?: unknown) => {
    // Single consistent namespace for grep/debugging
    // Intentionally using console.log for developer visibility.
    console.log("[videoFlow]", phase, extra || "");
  }, []);
  const itemsRef = useRef<SimpleVideoItem[]>([]);

  // Emit upstream changes and keep ref in sync for polling closure
  useEffect(() => {
    itemsRef.current = items;
    onItemsChange?.(items);
    const blocking = items.some(
      (i) =>
        i.status === "queued" ||
        i.status === "transcoding" ||
        i.status === "local"
    );
    onBlockingChange?.(blocking);
  }, [items, onBlockingChange, onItemsChange]);

  const captureFirstFrame = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      try {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.muted = true;
        v.playsInline = true;
        v.src = URL.createObjectURL(file);
        v.onloadeddata = () => {
          const target = v.duration && v.duration > 1 ? 1 : 0.1;
          const done = () => {
            try {
              const c = document.createElement("canvas");
              c.width = v.videoWidth || 320;
              c.height = v.videoHeight || 180;
              const ctx = c.getContext("2d");
              if (!ctx) return resolve(undefined);
              ctx.drawImage(v, 0, 0, c.width, c.height);
              resolve(c.toDataURL("image/jpeg", 0.7));
            } catch {
              resolve(undefined);
            } finally {
              URL.revokeObjectURL(v.src);
            }
          };
          if (Math.abs(v.currentTime - target) < 0.05) done();
          else {
            v.currentTime = target;
            v.onseeked = done;
          }
        };
        v.onerror = () => {
          URL.revokeObjectURL(v.src);
          resolve(undefined);
        };
      } catch {
        resolve(undefined);
      }
    });
  };

  const uploadSingle = useCallback(
    async (file: File) => {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const localUrl = URL.createObjectURL(file);
      log("select", {
        tempId,
        name: file.name,
        size: file.size,
        type: file.type,
      });

      // Insert local placeholder
      setItems((prev) => [
        ...prev,
        {
          id: tempId,
          name: file.name,
          localObjectUrl: localUrl,
          status: "local",
        },
      ]);

      // Kick off fast frame capture (non-blocking)
      const framePromise = captureFirstFrame(file).then((thumb) => {
        if (!thumb) return;
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId ? { ...it, thumbnailDataUrl: thumb } : it
          )
        );
        log("thumbnail.captured", { tempId });
      });

      // Begin upload to existing endpoint
      const fd = new FormData();
      fd.set("file", file);
      if (charterId) fd.set("charterId", charterId);
      let resp: Response;
      try {
        resp = await fetch("/api/media/video", { method: "POST", body: fd });
      } catch (e) {
        log("upload.network_error", { tempId, error: String(e) });
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId
              ? { ...it, status: "failed", error: "network" }
              : it
          )
        );
        return;
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        log("upload.http_error", {
          tempId,
          status: resp.status,
          body: text.slice(0, 250),
        });
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId
              ? { ...it, status: "failed", error: `http_${resp.status}` }
              : it
          )
        );
        return;
      }
      const data = await resp.json().catch(() => null);
      if (!data || !data.pendingMediaId) {
        log("upload.bad_response", { tempId, data });
        setItems((prev) =>
          prev.map((it) =>
            it.id === tempId
              ? { ...it, status: "failed", error: "bad_response" }
              : it
          )
        );
        return;
      }
      const pendingId = data.pendingMediaId as string;
      log("upload.enqueued", {
        tempId,
        pendingId,
        queueMeta: {
          transcodeQueued: data.transcodeQueued,
          directFallback: data.directFallback,
          queueError: data.queueError,
        },
      });

      const inlineReady = (data.finalUrl && data.status === "READY") || false;
      if (inlineReady) {
        log("upload.inline_ready", {
          pendingId,
          finalKey: data.finalKey,
          hasThumb: !!data.thumbnailUrl,
        });
      }

      // Promote temp -> queued or ready (inline)
      setItems((prev) =>
        prev.map((it) => {
          if (it.id !== tempId) return it;
          if (inlineReady) {
            return {
              ...it,
              id: pendingId,
              previewUrl: data.previewUrl,
              status: "ready",
              queuedAt: Date.now(),
              readyAt: Date.now(),
              finalUrl: data.finalUrl,
              finalKey: data.finalKey || undefined,
              thumbnailDataUrl: data.thumbnailUrl || it.thumbnailDataUrl,
            };
          }
          return {
            ...it,
            id: pendingId,
            previewUrl: data.previewUrl,
            status: "queued",
            queuedAt: Date.now(),
          };
        })
      );

      // Debug post-state snapshot
      setTimeout(() => {
        const snap = itemsRef.current.find((i) => i.id === pendingId);
        log("upload.post_state", {
          pendingId,
          status: snap?.status,
          hasFinal: !!snap?.finalUrl,
        });
      }, 50);

      // Ensure framePromise resolution does not reference stale temp id (id changed to pendingId above)
      framePromise.catch(() => {});
    },
    [charterId, log]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const list = Array.from(e.target.files || []);
      e.target.value = ""; // allow same file again
      if (!list.length) return;
      const allowed = list.filter((f) => f.type.startsWith("video/"));
      setTimeout(() => {
        allowed.slice(0, Math.max(0, max - items.length)).forEach(uploadSingle);
      }, 0);
    },
    [items.length, max, uploadSingle]
  );

  // Removal
  const removeItem = (id: string) => {
    log("remove.request", { id });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  // Polling logic: query existing pending ids
  const poll = useCallback(async () => {
    const snapshot = itemsRef.current; // always use ref to avoid stale closure lint noise
    const pendingIds = snapshot
      .filter(
        (i) =>
          i.status === "queued" ||
          i.status === "transcoding" ||
          i.status === "local"
      )
      .map((i) => i.id);
    if (!pendingIds.length) return;
    try {
      const params = new URLSearchParams();
      // Server endpoint expects 'ids' (plural). Using repeated 'ids' params.
      for (const id of pendingIds) params.append("ids", id);
      const resp = await fetch(`/api/media/pending?${params.toString()}`);
      if (!resp.ok) {
        log("poll.http_error", { status: resp.status });
        return;
      }
      type PendingPollItem = {
        id: string;
        status: "QUEUED" | "TRANSCODING" | "READY" | "FAILED";
        finalUrl?: string | null;
        finalKey?: string | null;
        thumbnailUrl?: string | null;
        error?: string | null;
      };
      const json = (await resp.json()) as { items: PendingPollItem[] };
      if (process.env.NEXT_PUBLIC_CHARTER_FORM_DEBUG === "1") {
        log(
          "poll.raw",
          json.items.map((p) => ({
            id: p.id,
            status: p.status,
            hasFinal: !!p.finalUrl,
          }))
        );
      }
      const now = Date.now();
      setItems((prev) =>
        prev.map((it) => {
          const p = json.items.find((x) => x.id === it.id);
          if (!p) return it;
          if (p.status === "FAILED") {
            log("status.failed", { id: it.id, error: p.error });
            return { ...it, status: "failed", error: p.error || undefined };
          }
          if (p.status === "TRANSCODING" && it.status !== "transcoding") {
            log("status.transcoding", { id: it.id });
            return { ...it, status: "transcoding", transcodingAt: now };
          }
          if (p.status === "READY") {
            // Transition to ready even if finalUrl momentarily absent; fill in when available.
            if (it.status !== "ready" || (p.finalUrl && !it.finalUrl)) {
              log("status.ready", {
                id: it.id,
                finalKey: p.finalKey,
                hasFinalUrl: !!p.finalUrl,
              });
              return {
                ...it,
                status: "ready",
                finalUrl: p.finalUrl || it.finalUrl,
                finalKey: p.finalKey || it.finalKey,
                readyAt: it.readyAt || now,
                thumbnailDataUrl: p.thumbnailUrl || it.thumbnailDataUrl,
              };
            }
          }
          return it;
        })
      );
    } catch (e) {
      log("poll.error", { error: String(e) });
    }
  }, [log]);

  // Start/stop polling (include 'local' in pending set; add eval log every render)
  useEffect(() => {
    if (destroyed.current) return;
    const hasPending = items.some(
      (i) => i.status !== "failed" && i.status !== "ready"
    );
    log("poll.eval", {
      hasPending,
      intervalActive: !!pollingRef.current,
      statuses: items.map((i) => i.status),
    });
    if (hasPending && !pollingRef.current) {
      log("poll.start");
      pollingRef.current = setInterval(poll, 3000);
      poll();
    } else if (!hasPending && pollingRef.current) {
      log("poll.stop");
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [items, poll, log]);

  useEffect(
    () => () => {
      destroyed.current = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Videos</h3>
        <label className="text-xs font-medium cursor-pointer rounded border border-neutral-300 px-2 py-1 shadow-sm bg-white hover:bg-slate-50">
          Add
          <input
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            disabled={items.length >= max}
            onChange={handleFileInput}
          />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((v) => {
          const showThumb =
            v.thumbnailDataUrl &&
            (v.status === "local" ||
              v.status === "queued" ||
              v.status === "transcoding" ||
              v.status === "ready");
          return (
            <div
              key={v.id}
              className="relative rounded-lg border bg-white p-2 text-xs flex flex-col gap-2"
            >
              <div className="relative h-32 w-full bg-slate-100 flex items-center justify-center overflow-hidden text-[10px] text-slate-500">
                {showThumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailDataUrl}
                    alt="thumb"
                    className="absolute inset-0 object-cover"
                  />
                )}
                {!showThumb && (
                  <span className="px-2 text-center">
                    {v.status === "failed" ? "Failed" : "Preparing"}
                  </span>
                )}
                {v.status === "ready" && v.finalUrl && (
                  <span className="absolute bottom-1 right-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Ready
                  </span>
                )}
                {v.status === "failed" && (
                  <span className="absolute bottom-1 right-1 rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Failed
                  </span>
                )}
                {v.status === "transcoding" && (
                  <span className="absolute bottom-1 right-1 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Transcoding
                  </span>
                )}
                {v.status === "queued" && (
                  <span className="absolute bottom-1 right-1 rounded bg-slate-500/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Queued
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="truncate" title={v.name}>
                  {v.name}
                </div>
                <div className="flex items-center gap-2">
                  {v.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => {
                        // Remove then re-add via file picker prompt (simplest retry UX at this stage)
                        removeItem(v.id);
                      }}
                      className="text-amber-600 hover:underline"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(v.id)}
                    className="text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-2 gap-y-0.5">
                <span>Status: {v.status}</span>
                {v.error && <span className="text-red-500">err:{v.error}</span>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full rounded border border-dashed border-neutral-300 p-6 text-center text-xs text-slate-500">
            No videos yet. Click Add to upload.
          </div>
        )}
      </div>
    </div>
  );
}
