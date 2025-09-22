// src/utils/resizeImage.ts
export type ResizeOptions = {
  maxWidth?: number;
  maxHeight?: number;
  mimeType?: "image/webp" | "image/jpeg" | "image/png";
  quality?: number;
  square?: boolean;
  nameSuffix?: string;
};

export async function resizeImageFile(
  input: File,
  opts: ResizeOptions = {}
): Promise<File> {
  const {
    maxWidth,
    maxHeight,
    mimeType = "image/webp",
    quality = 0.85,
    square = true,
    nameSuffix = ".resized",
  } = opts;

  if (!input || !input.type.startsWith("image/")) return input;

  let objectUrl: string | null = null;
  try {
    objectUrl = URL.createObjectURL(input);
    const img = await loadImage(objectUrl);

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    let sx = 0,
      sy = 0,
      sw = srcW,
      sh = srcH;

    if (square) {
      const side = Math.min(srcW, srcH);
      sx = Math.floor((srcW - side) / 2);
      sy = Math.floor((srcH - side) / 2);
      sw = side;
      sh = side;
    }

    let tW: number, tH: number;
    if (square) {
      const maxSide = maxWidth ?? 512; // default avatar size
      tW = Math.min(maxSide, sw);
      tH = Math.min(maxSide, sh);
    } else {
      const maxW = maxWidth ?? 1920; // default gallery size
      const maxH = maxHeight ?? 1080;
      const ratio = Math.min(maxW / sw, maxH / sh, 1);
      tW = Math.floor(sw * ratio);
      tH = Math.floor(sh * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = tW;
    canvas.height = tH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return input;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tW, tH);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), mimeType, quality)
    );
    if (!blob) return input;

    const ext =
      mimeType === "image/jpeg"
        ? ".jpg"
        : mimeType === "image/png"
        ? ".png"
        : ".webp";
    const base = input.name.replace(/\.[^.]+$/, "");
    const fileName = `${base}${nameSuffix}${ext}`;

    return new File([blob], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch (e) {
    console.error("resizeImageFile error:", e);
    return input;
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

type LoadedImage = HTMLImageElement & {
  naturalWidth: number;
  naturalHeight: number;
};

function loadImage(url: string): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img as LoadedImage);
    img.onerror = reject;
    img.src = url;
    img.crossOrigin = "anonymous";
  });
}
