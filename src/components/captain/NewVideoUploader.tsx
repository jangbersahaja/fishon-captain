"use client";
import { useVideoQueue } from "@/hooks/useVideoQueue";
import { VideoUploadItem } from "@/types/videoUpload";
import React, { useRef, useState } from "react";
import { VideoTrimModal } from "./VideoTrimModal";

export const NewVideoUploader: React.FC = () => {
  const {
    items,
    enqueue,
    cancel,
    retry,
    pause,
    resume,
    setMaxConcurrent,
    setAutoStart,
    startUpload,
    updatePendingTrim,
  } = useVideoQueue();
  const concurrencyRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [autoStart, setAuto] = useState(true);
  const [trimTargetId, setTrimTargetId] = useState<string | null>(null);
  const [trimFile, setTrimFile] = useState<File | null>(null);

  const toggleAuto = () => {
    const next = !autoStart;
    setAuto(next);
    setAutoStart(next);
  };

  const pick = () => inputRef.current?.click();
  const onFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => enqueue(f));
    if (inputRef.current) inputRef.current.value = "";
  };

  const openTrimFor = (item: VideoUploadItem) => {
    if (item.status !== "pending") return;
    setTrimTargetId(item.id);
    setTrimFile(item.file);
    // Ensure upload won't auto start mid-trim
    if (autoStart) toggleAuto();
  };

  const handleTrimConfirm = async (
    slice: Blob,
    startSec: number,
    duration: number,
    _probe: { width: number; height: number; codec: string; size: number },
    meta: { didFallback: boolean; fallbackReason?: string | null }
  ) => {
    if (!trimTargetId) return;
    const originalName = trimFile?.name || "video.mp4";
    const base = originalName.replace(/\.[a-z0-9]+$/i, "");
    const sliceFile = new File([slice], `${base}_trim.mp4`, {
      type: slice.type || "video/mp4",
    });
    updatePendingTrim(trimTargetId, {
      file: sliceFile,
      trim: {
        startSec,
        endSec: startSec + duration,
        didFallback: meta.didFallback,
        fallbackReason: meta.fallbackReason || undefined,
      },
    });
    setTrimTargetId(null);
    setTrimFile(null);
  };

  const closeTrim = () => {
    setTrimTargetId(null);
    setTrimFile(null);
  };

  return (
    <div className="space-y-4 border rounded p-4">
      <div className="sr-only" role="status" aria-live="polite">
        {(() => {
          const uploading = items.filter(
            (i) => i.status === "uploading"
          ).length;
          const processing = items.filter(
            (i) => i.status === "processing"
          ).length;
          const pending = items.filter((i) => i.status === "pending").length;
          if (items.length === 0) return "No videos queued.";
          return `${items.length} item${
            items.length > 1 ? "s" : ""
          } in queue: ${pending} pending, ${uploading} uploading, ${processing} processing.`;
        })()}
      </div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h3 className="font-semibold">Batch Uploader (Experimental)</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="flex items-center gap-1 text-[11px]">
            <span>Concurrency</span>
            <input
              ref={concurrencyRef}
              type="number"
              min={1}
              defaultValue={1}
              className="w-14 border rounded px-1 py-0.5 text-xs"
              onChange={(e) => setMaxConcurrent(Number(e.target.value) || 1)}
            />
          </label>
          <button
            onClick={pause}
            className="px-2 py-0.5 text-[11px] border rounded bg-gray-100 hover:bg-gray-200"
          >
            Pause
          </button>
          <button
            onClick={resume}
            className="px-2 py-0.5 text-[11px] border rounded bg-gray-100 hover:bg-gray-200"
          >
            Resume
          </button>
          <button
            onClick={toggleAuto}
            className={`px-2 py-0.5 text-[11px] border rounded ${
              autoStart
                ? "bg-green-100 hover:bg-green-200"
                : "bg-orange-100 hover:bg-orange-200"
            }`}
          >
            Auto {autoStart ? "On" : "Off"}
          </button>
          <button
            onClick={pick}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
          >
            Select Videos
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      <ul className="space-y-2 max-h-72 overflow-auto text-sm">
        {items.map((i: VideoUploadItem) => (
          <li
            key={i.id}
            className="border rounded p-2 flex flex-col gap-1 bg-white/50"
          >
            <div className="flex items-center justify-between">
              <span
                className="font-medium truncate max-w-[180px]"
                title={i.file.name}
              >
                {i.file.name}
              </span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-200 uppercase tracking-wide">
                {i.status}
              </span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${
                  i.status === "error"
                    ? "bg-red-500"
                    : i.status === "done"
                    ? "bg-green-600"
                    : "bg-blue-600"
                }`}
                style={{ width: `${Math.round(i.progress * 100)}%` }}
              />
            </div>
            {i.status === "error" && "error" in i && i.error && (
              <span className="text-[11px] text-red-600">{i.error}</span>
            )}
            {(i.status === "pending" || i.status === "uploading") && (
              <button
                onClick={() => cancel(i.id)}
                className="self-start text-[11px] px-2 py-0.5 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
            {i.status === "pending" && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => openTrimFor(i)}
                  className="text-[11px] px-2 py-0.5 rounded bg-purple-200 hover:bg-purple-300"
                >
                  Trim
                </button>
                {!autoStart && (
                  <button
                    onClick={() => startUpload(i.id)}
                    className="text-[11px] px-2 py-0.5 rounded bg-blue-200 hover:bg-blue-300"
                  >
                    Start
                  </button>
                )}
              </div>
            )}
            {i.status === "done" && (
              <span className="text-[10px] text-green-700">
                {(() => {
                  const total = i.completedAt - i.createdAt;
                  return `${(total / 1000).toFixed(1)}s total`;
                })()}
              </span>
            )}
            {i.status === "error" && (
              <button
                onClick={() => retry(i.id)}
                className="self-start text-[11px] px-2 py-0.5 rounded bg-yellow-300 hover:bg-yellow-400"
              >
                Retry
              </button>
            )}
            {i.status === "canceled" && (
              <button
                onClick={() => retry(i.id)}
                className="self-start text-[11px] px-2 py-0.5 rounded bg-gray-300 hover:bg-gray-400"
              >
                Re-Queue
              </button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-xs text-gray-500">No videos queued.</li>
        )}
      </ul>
      <p className="text-[11px] text-gray-500 leading-snug">
        Experimental batch uploader with optional pre-trim per pending item.
        Disable Auto to prepare trims before starting. Cancellation aborts
        active uploads. Retry or Re-Queue for failed/canceled items.
      </p>
      {trimFile && trimTargetId && (
        <VideoTrimModal
          file={trimFile}
          open={!!trimFile}
          onClose={closeTrim}
          onConfirm={handleTrimConfirm}
        />
      )}
    </div>
  );
};
