// Keyframe-accurate MP4 slice using MP4Box.js
// Usage: await trimMp4BoxKeyframeSlice(file, startSec, durationSec)

import * as MP4Box from "mp4box";

export interface TrimResult {
  blob: Blob; // resulting video data (trimmed or original)
  didFallback: boolean; // true if we didn't produce an actual trimmed subset
  fallbackReason?: string; // explanation for fallback
  usedStart: number; // start offset applied (seconds)
  usedDuration: number; // requested duration window
  notes?: string[]; // any diagnostic notes
}

// Feature flag: disable real trimming to force fallback (debug or if library unstable)
const ENABLE_TRIM =
  typeof process !== "undefined" &&
  (process.env.NEXT_PUBLIC_ENABLE_MP4_TRIM || "true").toLowerCase() === "true";

// CURRENT LIMITATION: We only seek to start keyframe; end-bound hard trimming not yet implemented.
// We therefore mark didFallback=true even if segmentation succeeded so that server / client can treat duration as a logical window.
export async function trimMp4BoxKeyframeSlice(
  file: File,
  startSec: number,
  durationSec: number
): Promise<TrimResult> {
  if (!file || file.size === 0) throw new Error("Empty file provided");
  if (!/\.mp4$/i.test(file.name) || !file.type.includes("mp4")) {
    throw new Error("Only MP4 files are supported");
  }

  const safeStart = Math.max(0, startSec || 0);
  const safeDuration = Math.max(0.1, durationSec || 0.1);
  const notes: string[] = [];

  if (!ENABLE_TRIM) {
    return {
      blob: file,
      didFallback: true,
      fallbackReason: "client_trim_disabled",
      usedStart: safeStart,
      usedDuration: safeDuration,
      notes: ["Feature flag disabled"],
    };
  }

  const CHUNK_SIZE = 1024 * 1024; // 1MB

  return new Promise<TrimResult>((resolve) => {
    // Using loose typing because mp4box types are partial; we wrap risky calls in try/catch.
    interface MP4SegInit {
      id: number;
      buffer: ArrayBuffer;
    }
    interface MP4InfoTrack {
      id: number;
      type: string;
      timescale?: number;
      movie_timescale?: number;
    }
    interface MP4Info {
      tracks: MP4InfoTrack[];
      timescale: number;
      duration: number;
    }
    const mp4boxFile = MP4Box.createFile() as unknown as {
      onError: (e: unknown) => void;
      onReady: (info: MP4Info) => void;
      onSegment: (
        id: number,
        user: unknown,
        buffer: ArrayBuffer,
        sampleNumber: number,
        last: boolean
      ) => void;
      setSegmentOptions: (
        id: number,
        user: unknown,
        opts: Record<string, unknown>
      ) => void;
      initializeSegmentation: () => MP4SegInit[];
      seek: (time: number, useRap?: boolean) => void;
      start: () => void;
      appendBuffer: (buf: ArrayBuffer) => void;
      flush: () => void;
    };
    let videoTrackId: number | null = null;
    // let movieTimescale = 0; // not used yet
    // Optional future use: trackTimescale
    // let trackTimescale = 0;
    let initSegment: ArrayBuffer | null = null;
    const fragmentBuffers: ArrayBuffer[] = [];
    // Flags for future refinement (unused now but harmless):
    // let receivedFirstSegment = false;
    let moovParsed = false;
    let aborted = false;

    const finishFallback = (reason: string, err?: unknown) => {
      if (aborted) return;
      aborted = true;
      if (err) notes.push(`${reason}: ${String(err)}`);
      console.warn("[trim] fallback", reason, err);
      resolve({
        blob: file,
        didFallback: true,
        fallbackReason: reason,
        usedStart: safeStart,
        usedDuration: safeDuration,
        notes,
      });
    };

    mp4boxFile.onError = (e: unknown) => {
      finishFallback("mp4box_error", e);
    };

    mp4boxFile.onReady = (info: MP4Info) => {
      moovParsed = true;
      const video = info.tracks.find((t) => t.type === "video");
      if (!video) return finishFallback("no_video_track");
      videoTrackId = video.id;
      // const movieTimescale = info.timescale; // not used yet
      // trackTimescale = video.timescale || video.movie_timescale || movieTimescale;

      // If selection exceeds actual media, clamp
      // const movieDurationSec = info.duration / movieTimescale; // not used yet
      // const clampedEnd = Math.min(targetEnd, movieDurationSec); // not yet used directly

      // Configure segmentation to start at nearest RAP >= safeStart
      try {
        if (videoTrackId == null) return finishFallback("missing_track_id");
        mp4boxFile.setSegmentOptions(videoTrackId, null, {
          rapAlignement: true,
          nbSamples: 60,
        });
        const inits = mp4boxFile.initializeSegmentation();
        const initForTrack = inits.find((i) => i.id === videoTrackId);
        if (!initForTrack) return finishFallback("no_init_segment");
        initSegment = initForTrack.buffer;

        // Seek to start (using RAP alignment). We use useRap=true
        mp4boxFile.seek(safeStart, true);
        mp4boxFile.start();

        // We'll stop after reaching clampedEnd (with small epsilon)
        mp4boxFile.onSegment = (
          id: number,
          _user: unknown,
          buffer: ArrayBuffer
        ) => {
          if (id !== videoTrackId) return;
          fragmentBuffers.push(buffer);
        };
      } catch (e) {
        return finishFallback("segmentation_setup_failed", e);
      }
    };

    // After full file appended & flushed, decide trim by reconstructing a Blob of init + fragments
    const finalize = () => {
      if (aborted) return;
      if (!initSegment || fragmentBuffers.length === 0) {
        return finishFallback("no_segments");
      }
      try {
        const blob = new Blob([initSegment, ...fragmentBuffers], {
          type: file.type || "video/mp4",
        });
        if (blob.size < 1024) {
          return finishFallback("blob_too_small");
        }
        aborted = true;
        // Because end-bound trimming not yet implemented, mark as fallback semantic
        notes.push(
          "End-bound trimming not yet implemented; server/client should honor usedDuration window"
        );
        resolve({
          blob,
          didFallback: true,
          fallbackReason: "end_bound_not_implemented",
          usedStart: safeStart,
          usedDuration: safeDuration,
          notes,
        });
      } catch (e) {
        finishFallback("assemble_failed", e);
      }
    };

    // Progressive read
    let offset = 0;
    const fileSize = file.size;

    const readNext = () => {
      if (aborted) return;
      if (offset >= fileSize) {
        try {
          mp4boxFile.flush();
        } catch (e) {
          return finishFallback("flush_failed", e);
        }
        // Defer finalize a tick to allow any final callbacks
        setTimeout(finalize, 0);
        return;
      }
      const end = Math.min(offset + CHUNK_SIZE, fileSize);
      const slice = file.slice(offset, end);
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (aborted) return;
        const ab = ev.target?.result as ArrayBuffer;
        // Inject required fileStart marker
        (ab as unknown as { fileStart: number }).fileStart = offset;
        try {
          mp4boxFile.appendBuffer(ab);
        } catch (e) {
          return finishFallback("append_failed", e);
        }
        offset = end;
        readNext();
      };
      reader.onerror = (err) => finishFallback("file_read_error", err);
      reader.readAsArrayBuffer(slice);
    };

    // Timeout safety: if nothing parsed in 5s, fallback
    setTimeout(() => {
      if (!moovParsed) finishFallback("timeout_moov");
    }, 5000);

    // Start reading
    readNext();
  });
}
