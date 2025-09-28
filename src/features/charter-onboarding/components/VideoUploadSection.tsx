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
  origin?: "seed" | "upload"; // seeded from DB vs just uploaded
  attemptedHoverCapture?: boolean; // avoid repeated captures
  thumbPersisting?: boolean;
  thumbSaved?: boolean;
  thumbFadingIn?: boolean; // fade-in animation for hover-captured thumb
  durationSeconds?: number;
  thumbCaptureBlocked?: boolean; // CORS/security failure
  thumbAttempts?: number; // capture tries
}

interface VideoUploadSectionProps {
  charterId?: string | null; // optional; can be null for orphans
  max?: number;
  onBlockingChange?: (blocking: boolean) => void; // emits true if any queued/transcoding
  onItemsChange?: (items: SimpleVideoItem[]) => void; // upstream persistence hook
  seedVideos?: {
    name: string;
    url: string;
    thumbnailUrl?: string;
    durationSeconds?: number;
    storageKey?: string;
  }[]; // existing ready videos from DB
}

export function VideoUploadSection({
  charterId = null,
  max = 5,
  onBlockingChange,
  onItemsChange,
  seedVideos = [],
}: VideoUploadSectionProps) {
  const [items, setItems] = useState<SimpleVideoItem[]>([]);
  // Queue for batched thumbnail persistence (debounced)
  const persistQueueRef = useRef<
    {
      storageKey: string;
      dataUrl: string;
      durationSeconds?: number;
      id: string;
      attempts: number;
    }[]
  >([]);
  const persistTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const destroyed = useRef(false);

  const log = useCallback((phase: string, extra?: unknown) => {
    // Single consistent namespace for grep/debugging
    // Intentionally using console.log for developer visibility.
    console.log("[videoFlow]", phase, extra || "");
  }, []);
  const itemsRef = useRef<SimpleVideoItem[]>([]);
  // Stable refs for callback props to avoid re-running effects due to identity churn
  const onItemsChangeRef = useRef<typeof onItemsChange>(onItemsChange);
  const onBlockingChangeRef = useRef<typeof onBlockingChange>(onBlockingChange);
  useEffect(() => {
    onItemsChangeRef.current = onItemsChange;
  }, [onItemsChange]);
  useEffect(() => {
    onBlockingChangeRef.current = onBlockingChange;
  }, [onBlockingChange]);

  // Emit upstream changes and keep ref in sync for polling closure.
  // Depend ONLY on items; function identity changes are handled via refs to prevent effect loop.
  useEffect(() => {
    itemsRef.current = items;
    onItemsChangeRef.current?.(items);
    const blocking = items.some(
      (i) =>
        i.status === "queued" ||
        i.status === "transcoding" ||
        i.status === "local"
    );
    onBlockingChangeRef.current?.(blocking);
  }, [items]);

  // Seed existing ready videos from DB on first mount (only if list is empty)
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!itemsRef.current.length && seedVideos.length) {
      const now = Date.now();
      const seeded: SimpleVideoItem[] = seedVideos.map((v) => ({
        id: v.storageKey || v.name,
        name: v.name,
        previewUrl: v.url,
        finalUrl: v.url,
        finalKey: v.storageKey || v.name,
        thumbnailDataUrl: v.thumbnailUrl,
        status: "ready",
        readyAt: now,
        origin: "seed",
        durationSeconds: v.durationSeconds,
      }));
      setItems(seeded);
      seededRef.current = true;
      log("seed.apply", { count: seeded.length });
    }
  }, [seedVideos, log]);

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
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      // Fire server removal best-effort if we have a charterId
      if (target && charterId) {
        // Ready video -> remove by storageKey (finalKey)
        if (target.status === "ready" && (target.finalKey || target.id)) {
          fetch(`/api/charters/${charterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              storageKey: target.finalKey || target.id,
            }),
          }).catch((e) =>
            console.warn("[videoFlow] remove.api_failed", {
              id,
              error: String(e),
            })
          );
        } else if (
          (target.status === "queued" || target.status === "transcoding") &&
          target.id
        ) {
          // Pending removal
          fetch(`/api/charters/${charterId}/media/remove`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingId: target.id }),
          }).catch((e) =>
            console.warn("[videoFlow] remove.pending_api_failed", {
              id,
              error: String(e),
            })
          );
        }
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  // Define persistence scheduler early (referenced by hover capture)
  const schedulePersistFlush = useCallback(() => {
    if (persistTimerRef.current) return; // already scheduled
    persistTimerRef.current = setTimeout(async () => {
      persistTimerRef.current = null;
      if (!charterId) return;
      const batch = persistQueueRef.current.splice(
        0,
        persistQueueRef.current.length
      );
      if (!batch.length) return;
      for (const job of batch) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === job.id ? { ...it, thumbPersisting: true } : it
          )
        );
        const attempt = async (): Promise<boolean> => {
          try {
            const resp = await fetch(
              `/api/charters/${charterId}/media/video/thumbnail`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  storageKey: job.storageKey,
                  dataUrl: job.dataUrl,
                  durationSeconds: job.durationSeconds,
                }),
              }
            );
            const js = await resp.json().catch(() => null);
            if (resp.ok && js && js.ok && js.thumbnailUrl) {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === job.id
                    ? {
                        ...it,
                        thumbnailDataUrl: js.thumbnailUrl,
                        thumbPersisting: false,
                        thumbSaved: true,
                        durationSeconds:
                          js.durationSeconds || it.durationSeconds,
                      }
                    : it
                )
              );
              return true;
            }
          } catch {
            /* ignore */
          }
          return false;
        };
        let success = await attempt();
        let delay = 400;
        while (!success && job.attempts < 3) {
          job.attempts += 1;
          await new Promise((r) => setTimeout(r, delay));
          success = await attempt();
          delay *= 2;
        }
        if (!success) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === job.id ? { ...it, thumbPersisting: false } : it
            )
          );
        }
      }
    }, 250);
  }, [charterId]);

  // Robust hover capture for existing READY videos without thumbnails (seeded or uploaded later with missing thumb)
  const attemptHoverCapture = useCallback(
    (video: SimpleVideoItem) => {
      if (!video.finalUrl) return;
      setItems((prev) =>
        prev.map((it) =>
          it.id === video.id
            ? {
                ...it,
                attemptedHoverCapture: true,
                thumbFadingIn: true,
                thumbAttempts: (it.thumbAttempts || 0) + 1,
              }
            : it
        )
      );
      log("capture.start", { id: video.id, url: video.finalUrl });
      try {
        const el = document.createElement("video");
        el.muted = true;
        el.playsInline = true;
        el.preload = "metadata";
        // Needed for canvas extraction from cross-origin (Blob) resources
        // Enable CORS-safe drawing to canvas (if server sets appropriate headers)
        el.crossOrigin = "anonymous";
        let loaded = false;
        const cleanup = () => {
          try {
            URL.revokeObjectURL(el.src);
          } catch {}
        };
        const doCapture = () => {
          if (loaded) return; // prevent double
          loaded = true;
          try {
            const canvas = document.createElement("canvas");
            canvas.width = el.videoWidth || 320;
            canvas.height = el.videoHeight || 180;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("no_ctx");
            ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
            const data = canvas.toDataURL("image/jpeg", 0.65);
            const duration =
              el.duration && isFinite(el.duration)
                ? Math.round(el.duration)
                : undefined;
            log("capture.success", { id: video.id, duration });
            setItems((prev) =>
              prev.map((it) =>
                it.id === video.id
                  ? {
                      ...it,
                      thumbnailDataUrl: data,
                      durationSeconds: it.durationSeconds || duration,
                    }
                  : it
              )
            );
            if (charterId && (video.finalKey || video.id)) {
              persistQueueRef.current.push({
                storageKey: video.finalKey || video.id,
                dataUrl: data,
                durationSeconds: duration,
                id: video.id,
                attempts: 0,
              });
              schedulePersistFlush();
            }
            setTimeout(() => {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === video.id ? { ...it, thumbFadingIn: false } : it
                )
              );
            }, 30);
          } catch (e) {
            log("capture.canvas_error", { id: video.id, error: String(e) });
            setItems((prev) =>
              prev.map((it) =>
                it.id === video.id
                  ? { ...it, thumbFadingIn: false, thumbCaptureBlocked: true }
                  : it
              )
            );
          } finally {
            cleanup();
          }
        };

        const targetTime = 0.1;
        const seekOrCapture = () => {
          try {
            el.currentTime = targetTime;
          } catch {
            doCapture();
          }
        };

        el.onloadedmetadata = () => {
          // If duration small just capture now
          seekOrCapture();
        };
        el.onseeked = () => doCapture();
        el.onerror = (ev) => {
          log("capture.error", { id: video.id, ev });
          setItems((prev) =>
            prev.map((it) =>
              it.id === video.id
                ? { ...it, thumbFadingIn: false, thumbCaptureBlocked: true }
                : it
            )
          );
          cleanup();
        };

        // timeout fallback (5s)
        setTimeout(() => {
          if (!loaded) {
            log("capture.timeout", { id: video.id });
            doCapture();
          }
        }, 5000);

        el.src = video.finalUrl;
      } catch (e) {
        log("capture.setup_failed", { id: video.id, error: String(e) });
        setItems((prev) =>
          prev.map((it) =>
            it.id === video.id
              ? { ...it, thumbFadingIn: false, thumbCaptureBlocked: true }
              : it
          )
        );
      }
    },
    [charterId, log, schedulePersistFlush]
  );

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
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    },
    []
  );

  // (schedulePersistFlush already declared earlier)

  // Derive display name from URL path if provided (ignore numeric DB names)
  const deriveDisplayName = (it: SimpleVideoItem): string => {
    const candidate =
      it.finalUrl || it.previewUrl || it.localObjectUrl || it.name;
    if (!candidate) return it.name;
    try {
      const clean = candidate.split("?")[0];
      const segs = clean.split("/");
      let last = segs[segs.length - 1] || it.name;
      // Remove potential unique suffix patterns like -abc123xyz.mp4 only if original part present
      // (Keep full if user intentionally had dashes.) We won't over-trim; just decode.
      try {
        last = decodeURIComponent(last);
      } catch {}
      return last;
    } catch {
      return it.name;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          Videos{" "}
          <span className="ml-1 text-xs text-slate-500">
            ({items.length}/{max})
          </span>
        </h3>
        <label className="text-xs font-medium cursor-pointer rounded border border-neutral-300 px-2 py-1 shadow-sm bg-white hover:bg-slate-50">
          Add Video
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
        {items.map((v, index) => {
          const showThumbArea =
            v.status === "local" ||
            v.status === "queued" ||
            v.status === "transcoding" ||
            v.status === "ready";
          const hasRealThumb = !!v.thumbnailDataUrl;
          return (
            <div
              key={v.id}
              className="group relative rounded-2xl border bg-white text-xs flex flex-col cursor-move shadow-sm overflow-hidden"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", String(index));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromStr = e.dataTransfer.getData("text/plain");
                const from = parseInt(fromStr, 10);
                if (Number.isNaN(from) || from === index) return;
                setItems((prev) => {
                  if (from < 0 || from >= prev.length) return prev;
                  const next = [...prev];
                  const [moved] = next.splice(from, 1);
                  next.splice(index, 0, moved);
                  log("reorder", { from, to: index });
                  return next;
                });
              }}
              onMouseEnter={() => {
                if (
                  v.status === "ready" &&
                  !v.thumbnailDataUrl &&
                  !v.attemptedHoverCapture &&
                  !v.thumbCaptureBlocked
                ) {
                  attemptHoverCapture(v);
                }
              }}
            >
              <div className="relative h-36 w-full bg-slate-100 flex items-center justify-center overflow-hidden text-[10px] text-slate-500">
                {!hasRealThumb && showThumbArea && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
                )}
                {showThumbArea && hasRealThumb && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.thumbnailDataUrl}
                    alt="thumb"
                    className={`absolute inset-0 object-cover transition-opacity duration-500 ${
                      v.thumbFadingIn ? "opacity-0" : "opacity-100"
                    }`}
                  />
                )}
                {v.durationSeconds && (
                  <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-medium px-1 rounded">
                    {Math.floor(v.durationSeconds / 60)
                      .toString()
                      .padStart(2, "0")}
                    :{(v.durationSeconds % 60).toString().padStart(2, "0")}
                  </span>
                )}
                {showThumbArea && !hasRealThumb && (
                  <div className="flex flex-col items-center gap-1 text-slate-500/70">
                    <div className="w-10 h-10 rounded bg-slate-300 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 text-white/80"
                      >
                        <path d="M8.25 5.25v13.5L18 12 8.25 5.25Z" />
                      </svg>
                    </div>
                    <span className="text-[9px] font-medium tracking-wide uppercase">
                      {v.status === "ready" ? "Video" : v.status}
                    </span>
                  </div>
                )}
                {!showThumbArea && (
                  <span className="px-2 text-center">
                    {v.status === "failed" ? "Failed" : "Preparing"}
                  </span>
                )}
                {/* Status badges replaced with icon chip at top-right */}
                <div className="absolute top-1 right-1 flex items-center gap-1">
                  {v.status === "ready" && (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-emerald-600/90 text-white"
                      title="Ready"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M9.53 16.28 5.28 12l1.06-1.06L9.53 14.4l8.13-8.13 1.06 1.06-9.19 9.19Z" />
                      </svg>
                    </span>
                  )}
                  {v.status === "transcoding" && (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-amber-500/90 text-white"
                      title="Transcoding"
                    >
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    </span>
                  )}
                  {v.status === "queued" && (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-slate-500/80 text-white"
                      title="Queued"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.25a.75.75 0 0 1 .75.75v5.19l3.22 1.86a.75.75 0 0 1-.75 1.3l-3.5-2.02a.75.75 0 0 1-.37-.65V6a.75.75 0 0 1 .75-.75Z" />
                      </svg>
                    </span>
                  )}
                  {v.status === "failed" && (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-red-600/90 text-white"
                      title="Failed"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 5v6.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0Zm-1.5 9a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z" />
                      </svg>
                    </span>
                  )}
                  {v.thumbPersisting && (
                    <span
                      className="w-5 h-5 inline-flex items-center justify-center rounded-full bg-slate-700/70 text-white"
                      title="Saving thumbnail"
                    >
                      <svg
                        className="w-3.5 h-3.5 animate-spin"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-2 border-t border-neutral-100 bg-white/60">
                <span className="truncate pr-2" title={deriveDisplayName(v)}>
                  {deriveDisplayName(v)}
                </span>
                <div className="flex items-center gap-1">
                  {v.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => removeItem(v.id)}
                      className="text-amber-600 hover:text-amber-700 p-1"
                      aria-label="Retry upload"
                      title="Retry upload"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-4 h-4"
                      >
                        <path d="M12 5V2L8 6l4 4V7a5 5 0 1 1-4.9 6h-2.02A7 7 0 1 0 12 5Z" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(v.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                    aria-label="Remove video"
                    title="Remove video"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4"
                    >
                      <path d="M3 6h18" />
                      <path d="M8 6v12c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V6" />
                      <path d="M10 10v6" />
                      <path d="M14 10v6" />
                      <path d="M9 6V4c0-.55.45-1 1-1h4c.55 0 1 .45 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
              {v.error && (
                <div className="px-2 pb-2 text-[10px] text-red-500 flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-3 h-3"
                  >
                    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm.75 5v6.25a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 1.5 0Zm-1.5 9.5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0Z" />
                  </svg>
                  {v.error}
                </div>
              )}
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
