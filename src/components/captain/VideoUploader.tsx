"use client";
import { useToasts } from "@/components/toast/ToastContext";
import { MAX_SHORT_VIDEO_BYTES } from "@/config/mediaProcessing";
import React, { useCallback, useRef, useState } from "react";
import { VideoTrimModal } from "./VideoTrimModal";

/**
 * @deprecated This component is deprecated as of Phase 13.
 * Please use EnhancedVideoUploader from "@/components/captain/EnhancedVideoUploader" instead.
 *
 * The new component provides:
 * - Automatic retry and persistence
 * - Better progress tracking
 * - Queue management for multiple uploads
 * - Enhanced error handling
 * - Thumbnail capture integration
 *
 * Migration guide: /docs/VIDEO_UPLOAD_MIGRATION.md
 */
// TODO: Integrate mp4box.js for keyframe aware trimming.

interface VideoUploaderProps {
  ownerId: string;
  onUploaded?: () => void;
}

interface StageState {
  stage:
    | "idle"
    | "selecting"
    | "trimming"
    | "uploading"
    | "finishing"
    | "error"
    | "done";
  message?: string;
  progress?: number; // 0..1
}

interface ActiveUploadContext {
  displayName: string; // original user file name (without _trim suffix)
  effectiveName: string; // actual file we are uploading
  startedAt: number;
  sizeBytes: number;
  didCancel?: boolean;
  abortController?: AbortController; // for finish phase
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  ownerId,
  onUploaded,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<StageState>({ stage: "idle" });
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [activeUpload, setActiveUpload] = useState<ActiveUploadContext | null>(
    null
  );
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const trimMetaRef = useRef<{
    didFallback: boolean;
    fallbackReason?: string | null;
  } | null>(null);
  const lastAnnouncedPercentRef = useRef<number>(-1);
  const toasts = useToasts();
  const pick = () => {
    if (state.stage === "uploading" || state.stage === "finishing") return; // prevent re-entry
    inputRef.current?.click();
  };

  const handleFile = (file: File) => {
    // Just open trim modal; final slice size validated later.
    setModalFile(file);
    setState({ stage: "trimming", message: "Prepare trim" });
  };

  const handleTrimConfirm = useCallback(
    async (
      slice: Blob,
      startSec: number,
      duration: number,
      probe: { width: number; height: number; codec: string; size: number },
      meta: { didFallback: boolean; fallbackReason?: string | null }
    ) => {
      try {
        trimMetaRef.current = meta;
        const originalName = modalFile?.name || "video.mp4";
        const base = originalName.replace(/\.[a-z0-9]+$/i, "");
        const sliceFile = new File([slice], `${base}_trim.mp4`, {
          type: slice.type || "video/mp4",
        });
        if (sliceFile.size > MAX_SHORT_VIDEO_BYTES) {
          setState({
            stage: "error",
            message: `Trimmed video exceeds limit (${(
              sliceFile.size /
              1024 /
              1024
            ).toFixed(1)}MB > ${(MAX_SHORT_VIDEO_BYTES / 1024 / 1024).toFixed(
              1
            )}MB)`,
          });
          return;
        }
        setActiveUpload({
          displayName: originalName,
          effectiveName: sliceFile.name,
          startedAt: performance.now(),
          sizeBytes: sliceFile.size,
        });
        setState({
          stage: "uploading",
          message: "Requesting upload URL",
          progress: 0,
        });

        // Step 1: create upload (get provisional blob key & upload target)
        const createRes = await fetch("/api/blob/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: sliceFile.name,
            fileType: sliceFile.type,
          }),
        });
        if (!createRes.ok) {
          setState({ stage: "error", message: "Failed to init upload" });
          return;
        }
        const { uploadUrl, blobKey } = await createRes.json();

        // Step 2: actual upload via form POST to /api/blob/upload
        setState({
          stage: "uploading",
          message: "Starting upload",
          progress: 0,
        });
        const formData = new FormData();
        formData.append("file", sliceFile);
        formData.append("shortVideo", "true");
        // Provide docType for server classification? optional for short video.
        // formData.append("docType", "captain_short_video");

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        let uploadErrored = false;
        const uploadStart = performance.now();
        xhr.upload.onprogress = (ev) => {
          if (!ev.lengthComputable) return;
          const fraction = ev.loaded / ev.total;
          const elapsed = (performance.now() - uploadStart) / 1000;
          const speed = ev.loaded / elapsed; // bytes/sec
          const remainingBytes = ev.total - ev.loaded;
          const etaSec = speed > 0 ? remainingBytes / speed : undefined;
          const pct = Math.floor(fraction * 100);
          if (pct !== lastAnnouncedPercentRef.current) {
            lastAnnouncedPercentRef.current = pct;
          }
          setState((s) => ({
            ...s,
            progress: fraction,
            message: etaSec
              ? `Uploading slice • ETA ${Math.max(1, Math.round(etaSec))}s`
              : "Uploading slice",
          }));
        };
        xhr.onerror = () => {
          uploadErrored = true;
          setState({ stage: "error", message: "Network error during upload" });
          setModalFile(null);
        };
        xhr.onabort = () => {
          uploadErrored = true;
          setState({ stage: "idle", message: undefined });
          setActiveUpload(null);
          xhrRef.current = null;
        };
        const uploadPromise = new Promise<{ url: string }>(
          (resolve, reject) => {
            xhr.onreadystatechange = () => {
              if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                  try {
                    resolve(JSON.parse(xhr.responseText));
                  } catch (e) {
                    reject(e);
                  }
                } else if (!uploadErrored) {
                  reject(new Error(`Upload failed (${xhr.status})`));
                }
              }
            };
          }
        );
        xhr.open("POST", uploadUrl);
        xhr.send(formData);
        let uploadJson: { url: string };
        try {
          uploadJson = await uploadPromise;
        } catch (e) {
          if (!uploadErrored) {
            setState({ stage: "error", message: (e as Error).message });
            setModalFile(null);
          }
          return;
        }
        xhrRef.current = null;
        const uploadEnd = performance.now();
        const uploadMs = Math.round(uploadEnd - uploadStart);
        const videoUrl = uploadJson.url as string;

        // Step 3: thumbnail generation (client capture)
        setState({ stage: "finishing", message: "Generating thumbnail" });
        let thumbBlob: Blob | null = null;
        try {
          thumbBlob = await captureThumbnail(videoUrl);
        } catch (e) {
          console.warn("thumbnail capture failed", e);
        }

        // Step 4: finish call with metadata
        setState({ stage: "finishing", message: "Finalizing" });
        const form = new FormData();
        form.append("videoUrl", videoUrl);
        form.append("startSec", String(startSec));
        form.append("duration", String(duration));
        form.append("ownerId", ownerId);
        form.append("blobKey", blobKey);
        if (trimMetaRef.current) {
          form.append("didFallback", String(trimMetaRef.current.didFallback));
          if (trimMetaRef.current.fallbackReason) {
            form.append(
              "fallbackReason",
              trimMetaRef.current.fallbackReason.slice(0, 300)
            );
          }
        }
        if (thumbBlob) {
          form.append("thumbnail", thumbBlob, "thumb.jpg");
        }
        form.append("probe", JSON.stringify(probe));
        const finishAbort = new AbortController();
        setActiveUpload(
          (ctx) => ctx && { ...ctx, abortController: finishAbort }
        );
        const finishRes = await fetch("/api/blob/finish", {
          method: "POST",
          body: form,
          signal: finishAbort.signal,
        });
        if (!finishRes.ok) {
          setState({ stage: "error", message: "Finish failed" });
          setModalFile(null);
          return;
        }
        setState({ stage: "done", message: "Uploaded" });
        setState({ stage: "done", message: "Uploaded" });
        setModalFile(null);
        onUploaded?.();
        // Unified success toast; fallback details only in analytics/metrics
        toasts.push({
          type: "success",
          message: "Video uploaded",
          autoDismiss: 4000,
        });

        // Step 5: analytics (fire & forget)
        fetch("/api/videos/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: sliceFile.name,
            sizeBytes: sliceFile.size,
            durationSec: duration,
            startSec,
            trimmed: true,
            didFallback: trimMetaRef.current?.didFallback ?? false,
            fallbackReason: trimMetaRef.current?.fallbackReason,
            uploadMs,
          }),
        }).catch(() => {});
      } catch (e) {
        setState({ stage: "error", message: (e as Error).message });
        setModalFile(null);
      }
    },
    [modalFile, ownerId, onUploaded, toasts]
  );

  return (
    <div className="p-4 border rounded space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Short Video</h3>
        {!["trimming", "uploading", "finishing"].includes(state.stage) && (
          <button
            type="button"
            onClick={pick}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
          >
            Select Video
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {(state.stage === "uploading" || state.stage === "finishing") &&
        activeUpload && (
          <div className="flex gap-4 items-start" aria-busy={true}>
            <div className="sr-only" role="status" aria-live="polite">
              {state.stage === "uploading" &&
                `Uploading ${activeUpload.displayName}. ${state.message || ""}`}
              {state.stage === "finishing" &&
                `${state.message || "Finalizing"} ${activeUpload.displayName}`}
              {typeof state.progress === "number" &&
                state.progress > 0 &&
                state.progress < 1 &&
                ` ${Math.round(state.progress * 100)} percent.`}
            </div>
            <div className="aspect-video w-40 sm:w-56 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-neutral-700 dark:to-neutral-600 rounded relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-black/5 dark:bg-black/20" />
              <div className="z-10 flex flex-col items-center justify-center p-2 text-center w-full h-full">
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-200 truncate max-w-full">
                  {state.stage === "uploading"
                    ? state.message
                    : state.stage === "finishing"
                    ? state.message || "Finalizing"
                    : "Processing"}
                </span>
                {typeof state.progress === "number" &&
                  state.progress > 0 &&
                  state.progress < 1 && (
                    <div className="w-full mt-2 h-1.5 bg-white/50 dark:bg-black/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all"
                        style={{
                          width: `${Math.round(state.progress * 100)}%`,
                        }}
                      />
                    </div>
                  )}
                {activeUpload.sizeBytes > 0 &&
                  state.stage === "uploading" &&
                  typeof state.progress === "number" && (
                    <span className="mt-1 text-[9px] text-gray-600 dark:text-gray-300">
                      {(
                        (activeUpload.sizeBytes * (state.progress || 0)) /
                        1024 /
                        1024
                      ).toFixed(1)}
                      MB / {(activeUpload.sizeBytes / 1024 / 1024).toFixed(1)}MB
                    </span>
                  )}
              </div>
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                <span
                  className="inline-block w-4 h-4 border-[2px] border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"
                  aria-label="Uploading"
                />
                <span className="truncate">
                  Uploading {activeUpload.displayName}
                </span>
              </div>
              <div className="flex gap-2">
                <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400 pr-2 flex-1">
                  Keep this page open until finished. The video will appear
                  below once processing completes.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (state.stage === "uploading") {
                      xhrRef.current?.abort();
                      setState({ stage: "idle", message: "Upload canceled" });
                      setActiveUpload(null);
                    } else if (
                      state.stage === "finishing" &&
                      activeUpload.abortController
                    ) {
                      activeUpload.abortController.abort();
                      setState({ stage: "idle", message: "Upload canceled" });
                      setActiveUpload(null);
                    }
                  }}
                  className="self-start text-xs px-2 py-1 rounded bg-gray-300 hover:bg-gray-400 dark:bg-neutral-600 dark:hover:bg-neutral-500 text-gray-800 dark:text-gray-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      {state.stage === "error" && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2">
          <span className="font-semibold">Upload Error:</span>
          <span className="flex-1">
            {state.message || "Something went wrong."}
          </span>
          <button
            type="button"
            onClick={() => {
              setState({ stage: "idle" });
              setActiveUpload(null);
            }}
            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reset
          </button>
        </div>
      )}
      {state.stage === "done" && activeUpload && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-200 rounded p-2">
          Uploaded {activeUpload.displayName}. It should appear shortly below.
        </div>
      )}
      {state.stage === "idle" && (
        <div className="text-xs text-gray-500">
          Select a short video (≤30s) to begin.
        </div>
      )}
      {/* sliceUrl removed: preview handled in modal */}
      {modalFile && (
        <VideoTrimModal
          file={modalFile}
          open={!!modalFile}
          onClose={() => setModalFile(null)}
          onConfirm={handleTrimConfirm}
        />
      )}
    </div>
  );
};

async function captureThumbnail(src: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    const onError = () => reject(new Error("video load error"));
    video.addEventListener("error", onError);
    video.addEventListener("loadeddata", () => {
      try {
        video.currentTime = Math.min(0.2, (video.duration || 1) - 0.1);
      } catch {}
    });
    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const w = (canvas.width = video.videoWidth || 320);
        const h = (canvas.height = video.videoHeight || 180);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas context"));
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("thumb blob null"))),
          "image/jpeg",
          0.82
        );
      } catch (e) {
        reject(e);
      } finally {
        video.remove();
      }
    });
  });
}
