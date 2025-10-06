// Capture a thumbnail (JPEG) from a video URL or File object (browser only).
// Chooses a frame near 0.2s (or slightly before end if shorter).
export async function captureThumbnailFromSrc(src: string): Promise<Blob> {
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
      } catch {
        // ignore seek errors
      }
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

export async function captureThumbnailFromFile(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    return await captureThumbnailFromSrc(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}
