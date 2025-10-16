import { z } from "zod";

/**
 * Video processing status enum
 * Tracks the lifecycle of a video from queue to ready/failed state
 */
export const ProcessStatusEnum = z.enum([
  "queued",
  "processing",
  "ready",
  "failed",
]);

export type ProcessStatus = z.infer<typeof ProcessStatusEnum>;

/**
 * Schema for creating a new video upload
 * Used when initiating a video upload flow
 * 
 * Note: Mobile devices may not set proper MIME types, so we accept:
 * - video/* MIME types
 * - Empty strings (will validate by file extension)
 * - application/octet-stream (generic fallback used by some mobile browsers)
 */
export const CreateUploadSchema = z.object({
  fileName: z.string().min(1).max(256),
  fileType: z.string().refine(
    (type) => {
      // Accept empty string (fallback to extension check)
      if (type === "") return true;
      // Accept video/* MIME types
      if (type.startsWith("video/")) return true;
      // Accept generic MIME type used by mobile browsers
      if (type === "application/octet-stream") return true;
      return false;
    },
    { message: "Must be a video file" }
  ),
});

/**
 * Schema for finishing/finalizing a video upload
 * Includes trim metadata and processing details
 */
export const FinishFormSchema = z.object({
  videoUrl: z.string().url(),
  startSec: z.number().min(0).max(86400),
  // Added optional endSec (exclusive) to allow backend to know trimmed selection length
  endSec: z.number().min(0).max(86400).optional(),
  // Added metadata fields to support bypass logic and metrics
  width: z.number().min(0).max(10000).optional(),
  height: z.number().min(0).max(10000).optional(),
  originalDurationSec: z.number().min(0).max(86400).optional(),
  ownerId: z.string().min(1),
  didFallback: z.boolean().optional(),
  fallbackReason: z.string().max(300).optional(),
});

/**
 * Schema for video transcoding payload sent to worker
 */
export const TranscodePayloadSchema = z.object({
  videoUrl: z.string().url(),
  startSec: z.number().min(0).max(86400),
  videoId: z.string().min(1),
});

/**
 * Schema for listing videos by owner
 */
export const ListQuerySchema = z.object({
  ownerId: z.string().min(1),
});

/**
 * Validate thumbnail file constraints
 * @param file - File to validate
 * @returns true if valid, false otherwise
 */
export function validateThumbFile(file: File) {
  const allowed = ["image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(file.type)) return false;
  if (file.size > 2 * 1024 * 1024) return false; // 2MB
  return true;
}

/**
 * Supported video file extensions by category
 * Used for fallback validation when MIME type is unavailable or incorrect
 */
const SUPPORTED_VIDEO_EXTENSIONS = [
  // Modern web formats
  "mp4", "webm", "ogg",
  // Apple formats
  "mov", "m4v", "m4p",
  // Mobile formats (Android)
  "3gp", "3gpp",
  // Legacy/Desktop formats
  "avi", "mkv", "flv", "wmv",
  // MPEG variants
  "mpg", "mpeg", "mpe", "mpv", "m2v",
  // Transport streams
  "m2ts", "mts"
];

/**
 * Pre-compiled regex for video file extension validation
 * Cached for performance to avoid recompilation on every call
 */
const VIDEO_EXTENSION_REGEX = new RegExp(
  `\\.(${SUPPORTED_VIDEO_EXTENSIONS.join("|")})$`,
  "i"
);

/**
 * Validate video file type
 * Mobile-friendly validation that checks both MIME type and file extension
 * 
 * @param file - File to validate
 * @returns true if valid video file, false otherwise
 * 
 * @remarks
 * Mobile devices (especially iOS) may not set proper MIME types or may use:
 * - Empty string
 * - "application/octet-stream"
 * - Incorrect MIME types (e.g., "audio/mpeg" for .mp4 files)
 * - Unexpected video MIME types like "video/quicktime" for .mov files
 * 
 * Strategy:
 * 1. If MIME type is video/*, accept immediately (most reliable case)
 * 2. Always check file extension as fallback (handles empty/wrong/generic MIME types)
 * 
 * This intentionally allows files with wrong MIME types if they have valid video extensions,
 * as mobile browsers frequently misreport MIME types.
 */
export function isValidVideoFile(file: File): boolean {
  // Fast path: If MIME type is valid video type, accept immediately
  if (file.type && file.type.startsWith("video/")) {
    return true;
  }
  
  // Fallback: Check file extension for common video formats
  // This handles: empty MIME, application/octet-stream, wrong MIME types
  return VIDEO_EXTENSION_REGEX.test(file.name);
}
