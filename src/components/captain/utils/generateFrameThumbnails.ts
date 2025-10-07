// Utility to generate frame thumbnails with cancellable logic.
// Provides test-friendly injection points and returns a cancel function.
// NOTE: Future enhancement: integrate AbortController when worker-based extraction is implemented.

export interface GenerateThumbnailsOptions {
  frameCount?: number;
  // Custom frame capture hook for tests; returns a data URL string.
  captureFrame?: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ) => string | null;
  quality?: number; // JPEG quality 0-1
}

export interface GenerateThumbnailsResult {
  promise: Promise<string[]>;
  cancel: () => void;
}

export function generateFrameThumbnails(
  video: HTMLVideoElement,
  duration: number,
  options: GenerateThumbnailsOptions = {}
): GenerateThumbnailsResult {
  const { frameCount = 20, captureFrame, quality = 0.7 } = options;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
  };

  const promise = (async () => {
    if (!video || !duration || frameCount <= 0) return [];
    if (!video.videoWidth || !video.videoHeight) return [];

    const frames: string[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    // Fixed dimensions (can be adapted later)
    const targetW = 60;
    const targetH = 34;
    canvas.width = targetW;
    canvas.height = targetH;

    const originalPaused = video.paused;
    const originalTime = video.currentTime;

    const captureTimes = Array.from(
      { length: frameCount },
      (_, i) => (i / (frameCount - 1)) * duration
    );

    const seekTo = (time: number) =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve();
        };
        const handle = () => finish();
        const fallback = () => {
          if (Math.abs(video.currentTime - time) < 0.06) finish();
        };
        const cleanup = () => {
          video.removeEventListener("seeked", handle);
          video.removeEventListener("timeupdate", fallback);
        };
        video.addEventListener("seeked", handle);
        video.addEventListener("timeupdate", fallback);
        try {
          video.currentTime = time;
        } catch {
          finish();
        }
        setTimeout(finish, 350); // safety
      });

    for (const t of captureTimes) {
      if (cancelled) break;
      try {
        video.pause();
      } catch {}
      await seekTo(t);
      if (cancelled) break;
      try {
        if (captureFrame) {
          const data = captureFrame(video, canvas);
          if (data) frames.push(data);
        } else {
          ctx.drawImage(video, 0, 0, targetW, targetH);
          frames.push(canvas.toDataURL("image/jpeg", quality));
        }
      } catch {
        // Swallow individual frame errors
      }
    }

    // Restore state
    try {
      video.currentTime = originalTime;
    } catch {}
    if (!originalPaused) {
      try {
        video.play();
      } catch {}
    }

    return frames;
  })();

  return { promise, cancel };
}
