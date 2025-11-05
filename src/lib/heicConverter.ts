/**
 * HEIC to JPEG Conversion Utility
 * Converts HEIC/HEIF images to JPEG format for web compatibility
 */

import convert from "heic-convert";

/**
 * Check if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();

  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type === "image/heic" ||
    type === "image/heif"
  );
}

/**
 * Convert HEIC file to JPEG
 * @param file - HEIC file to convert
 * @param quality - JPEG quality (0-1), default 0.92
 * @returns Converted File object in JPEG format
 */
export async function convertHeicToJpeg(
  file: File,
  quality: number = 0.92
): Promise<File> {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert HEIC to JPEG
    const outputBuffer = await convert({
      buffer,
      format: "JPEG",
      quality, // 0-1 scale
    });

    // Create new File object with JPEG data
    // Convert Buffer to Uint8Array for Blob compatibility
    const uint8Array = new Uint8Array(outputBuffer);
    const jpegBlob = new Blob([uint8Array], { type: "image/jpeg" });

    // Generate new filename: replace .heic/.heif with .jpg
    const originalName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    const jpegFile = new File([jpegBlob], originalName, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    console.log(
      `[heic-convert] Converted ${file.name} (${formatBytes(file.size)}) to ${jpegFile.name} (${formatBytes(jpegFile.size)})`
    );

    return jpegFile;
  } catch (error) {
    console.error("[heic-convert] Conversion failed:", error);
    throw new Error(
      `Failed to convert HEIC image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Process file - convert if HEIC, otherwise return as-is
 * @param file - File to process
 * @param quality - JPEG quality if conversion needed (0-1), default 0.92
 * @returns Original file or converted JPEG file
 */
export async function processImageFile(
  file: File,
  quality: number = 0.92
): Promise<File> {
  if (isHeicFile(file)) {
    console.log(`[heic-convert] Detected HEIC file: ${file.name}`);
    return await convertHeicToJpeg(file, quality);
  }
  return file;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
