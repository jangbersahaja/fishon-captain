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
 * - Unexpected video MIME types like "video/quicktime" for .mov files
 * 
 * This function validates by both MIME type and file extension to handle all cases.
 */
export function isValidVideoFile(file: File): boolean {
  // Check MIME type if available and not generic
  if (file.type && file.type !== "application/octet-stream") {
    if (file.type.startsWith("video/")) {
      return true;
    }
    // If MIME type is set but doesn't start with video/, it's invalid
    // unless we fall through to extension check
  }
  
  // Fallback: Check file extension for common video formats
  // Including mobile-specific formats (.3gp, .m4v, etc.)
  const videoExtensions = /\.(mp4|mov|webm|ogg|avi|mkv|3gp|3gpp|m4v|flv|wmv|m2v|m4p|mpg|mpeg|mpe|mpv|m2ts|mts)$/i;
  return videoExtensions.test(file.name);
}
