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
 */
export const CreateUploadSchema = z.object({
  fileName: z.string().min(1).max(256),
  fileType: z.string().regex(/^video\//, "Must be a video MIME type"),
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
